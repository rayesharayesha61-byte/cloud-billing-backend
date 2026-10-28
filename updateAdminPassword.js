
const bcrypt = require("bcrypt");
const db = require("./config/db");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter new Admin password: ", async (password) => {
  try {
    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `UPDATE users
       SET password = ?
       WHERE email = ?
       AND role = 'ADMIN'`,
      [hashedPassword, "rayesharayesha61@gmail.com"]
    );

    if (result.affectedRows === 0) {
      console.log("Admin account not found.");
    } else {
      console.log("Admin password updated successfully.");
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    rl.close();
    if (typeof db.end === "function") {
      await db.end();
    }
  }
});
