const mongoose = require('mongoose');
const Library = require('./models/LibrarySchema');

mongoose.connect('mongodb+srv://drharsh821115_db_user:Lxq3reHn72K04jrn@power0.qpo1o6h.mongodb.net/?appName=power0')
  .then(async () => {
    // Find the library with the fake URL and remove it
    await Library.updateMany(
        { image: "https://res.cloudinary.com/test/image.jpg" },
        { $unset: { image: 1 } }
    );
    console.log("Cleaned up fake test image from MongoDB");
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
