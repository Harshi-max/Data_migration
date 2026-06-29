
import dotenv from "dotenv";
import { app } from "./App.js";

dotenv.config({ path: "./.env" });

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`✅ Server is listening on port ${port}`);
});
