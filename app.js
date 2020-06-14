//jshint esversion:6

const express = require("express");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set("view engine", "ejs");

app.use(express.urlencoded()); // replaces body-parser middleware
app.use(express.static("public"));

// use mongoose and create todolistDB database
// connects to cloud DB with atlas and AWS
mongoose.connect(
  "mongodb+srv://admin-brady:Test123@cluster0-4koxc.mongodb.net/todolistDB",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  }
);

// schema for database
const itemSchema = {
  name: String,
};

const listSchema = {
  name: String,
  items: [itemSchema],
};

// model capitalized
// first parameter is singular name for database
// second parameter is schema used
const Item = mongoose.model("Item", itemSchema);

const List = mongoose.model("List", listSchema);

// // make a dfault item
// const item1 = new Item({name: "Default Item"});
// const defaultItems = [item1];
// const defaultList = new List({name: 'Today'});

// home page
app.get("/", function (req, res) {
  Item.find({}, function (err, foundItems) {
    List.find({}, function (err, allLists) {
      res.render("list", {
        listTitle: "Today",
        newListItems: foundItems,
        customListNames: allLists,
      });
    });
  });
});

// custom list handling
app.get("/:customListName", function (req, res) {
  const customListName = _.capitalize(req.params.customListName);

  List.findOne({ name: customListName }, function (err, foundList) {
    if (!err) {
      if (!foundList) {
        // create new list
        const list = new List({
          name: customListName,
          items: [],
        });
        list.save();
        res.redirect("/" + customListName);
      } else {
        // show existing lists
        List.find({}, function (err, allLists) {
          res.render("list", {
            listTitle: foundList.name,
            newListItems: foundList.items,
            customListNames: allLists,
          });
        });
      }
    }
  });
});

// add new item to current list array
app.post("/", function (req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;

  const newItem = new Item({ name: itemName });

  // sees if we are in default list or custom list
  // saves to database of that list and remains on the custom page
  if (listName === "Today") {
    newItem.save();
    res.redirect("/");
  } else {
    List.findOne({ name: listName }, function (err, foundList) {
      foundList.items.push(newItem);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

// add custom list
app.post("/custom", function (req, res) {
  let newList;
  // checks for user choosing existing list or user creating a new list
  req.body.newList === undefined
    ? (newList = req.body.lists) // this if chose existing list
    : (newList = req.body.newList); // this if create new list
  res.redirect("/" + newList);
});

app.post("/delete-clear-list", function (req, res) {
  const buttonClicked = req.body;
  let listName;
  if (buttonClicked.deleteList) {
    // delete current list
    listName = buttonClicked.deleteList;
    List.deleteOne({ name: listName }).then(res.redirect("/"));
  } else {
    // clear items of current list
    listName = buttonClicked.clearList;
    // clears items in collection and redirects to same page
    List.updateOne({ name: listName }, { $set: { items: [] } }, function (err, affected) {
      if (err) throw err;
      res.redirect("/" + listName);
    });
  }
});

// delete item from list array
app.post("/delete", function (req, res) {
  const itemToDelete = req.body.deleteItem;
  const title = req.body.listName;

  if (title === "Today") {
    // remove by id the item that was chosen by checkbox in list.ejs
    // callback fundtion is required in this case or else the item will not be removed
    Item.findByIdAndRemove(itemToDelete, function (err) {
      if (!err) {
        res.redirect("/");
      }
    });
  } else {
    List.findOneAndUpdate(
      { name: title },
      { $pull: { items: { _id: itemToDelete } } },
      function (err) {
        if (!err) {
          res.redirect("/" + title);
        }
      }
    );
  }
});

// allows us to open on localport 3000 or work with heroku
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function () {
  console.log("Server started successfully");
});
