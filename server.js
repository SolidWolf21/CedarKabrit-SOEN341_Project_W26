const path = require("path");
const express = require("express");

const app = express();
const port = process.env.PORT || 3000;
const frontendDir = path.join(__dirname, "frontend");

app.use(express.static(frontendDir));

app.get("/", (req, res) => {
    res.sendFile(path.join(frontendDir, "index.html"));
});

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.listen(port, () => {
    console.log(`MealMajor server running on http://localhost:${port}`);
});
