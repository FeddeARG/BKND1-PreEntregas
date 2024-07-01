const express = require("express");

const app = express();
const PORT = 8080;

app.listen(PORT, () => {
    console.log("Server running on PORT: ", PORT);
});


const fs = require('fs').promises

