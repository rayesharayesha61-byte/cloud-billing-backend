// const express = require("express");
// const cors = require("cors");

// require("dotenv").config();

// const authRoutes = require("./routes/authRoutes");
// const businessRoutes = require("./routes/businessRoutes");
// const productRoutes = require("./routes/productRoutes");
// const customerRoutes = require("./routes/customerRoutes");
// const invoiceRoutes = require("./routes/invoiceRoutes");
// const reportRoutes = require("./routes/reportRoutes");
// const expenseRoutes = require("./routes/expenseRoutes");
// const subscriptionRoutes = require("./routes/subscriptionRoutes");
// const settingsRoutes = require("./routes/settingsRoutes");
// const adminRoutes = require("./routes/adminRoutes");
// const businessSettingsRoutes = require("./routes/businessSettings");

// const app = express();
// const path = require("path");

// app.use(
//   "/uploads",
//   express.static(
//     path.join(__dirname, "uploads")
//   )
// );
// /* Middleware */

// app.use(
//   cors({
//     origin: "http://localhost:3000",
//   })
// );

// app.use(express.json());

// app.use(express.urlencoded({
//   extended: true,
// }));
// // app.use(
// //   "/api/business",
// //   businessRoutes
// // );
// /* Test API */

// app.use("/api/settings", settingsRoutes);
// app.use("/api/admin", adminRoutes);

// app.use(express.json());
// app.use("/api/subscription", require("./routes/subscriptionRoutes"));
// app.use("/api/business-settings", businessSettingsRoutes);
// app.get("/", (req, res) => {
//   res.json({
//     message:
//       "CloudBill API is running successfully.",
//   });
// });


// app.use("/api/reports", reportRoutes);
// /* Auth Routes */

// app.use(
//   "/api/auth",
//   authRoutes
// );
// app.use("/api/business", businessRoutes);
// app.use("/api/products", productRoutes);
// app.use("/api/customers", customerRoutes);
// app.use("/api/expenses", expenseRoutes);
// app.use(
//   "/api/invoices",
//   invoiceRoutes
// );
// /* Server */

// const PORT =
//   process.env.PORT || 5000;

// app.listen(PORT, () => {
//   console.log(
//     `CloudBill server running on port ${PORT}`
//   );
// });

const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const businessRoutes = require("./routes/businessRoutes");
const productRoutes = require("./routes/productRoutes");
const customerRoutes = require("./routes/customerRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const reportRoutes = require("./routes/reportRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const adminRoutes = require("./routes/adminRoutes");
const businessSettingsRoutes = require("./routes/businessSettings");
const superAdminRoutes = require("./routes/superAdminRoutes");
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    message: "CloudBill API is running successfully.",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/products", productRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/business-settings", businessSettingsRoutes);


// Existing admin route-க்கு கீழே
app.use("/api/super-admin", superAdminRoutes);
// Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`CloudBill server running on port ${PORT}`);
});
