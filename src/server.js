const app = require("./controllers/serverController");

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`MealMajor server running on http://localhost:${port}`);
});
