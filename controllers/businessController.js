const db = require("../config/db");

const {
  getBusinessById,
  createBusiness,
  updateBusiness,
} = require("../models/businessModel");

/*
  GET BUSINESS DETAILS
  GET /api/business
*/
const getBusiness = async (req, res) => {
  try {
    const userId = req.user.userId;

    const [users] = await db.promise().query(
      `
      SELECT business_id
      FROM users
      WHERE id = ?
      `,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const businessId = users[0].business_id;

    if (!businessId) {
      return res.status(200).json({
        business: null,
        message: "Business details not created yet.",
      });
    }

    const business = await getBusinessById(businessId);

    if (!business) {
      return res.status(404).json({
        message: "Business not found.",
      });
    }

    return res.status(200).json({
      business,
    });
  } catch (error) {
    console.error("Get Business Error:", error);

    return res.status(500).json({
      message: "Failed to load business details.",
    });
  }
};

/*
  CREATE / UPDATE BUSINESS DETAILS
  PUT /api/business
*/
const saveBusiness = async (req, res) => {
  try {
    const userId = req.user.userId;

    const {
      business_name,
      owner_name,
      mobile,
      email,
      address,
      gst_number,
      pan_number,
      business_type,
      state,
      logo,
      invoice_prefix,
    } = req.body;

    /*
      Required fields
    */
    if (
      !business_name ||
      !owner_name ||
      !mobile ||
      !email
    ) {
      return res.status(400).json({
        message:
          "Business name, owner name, mobile and email are required.",
      });
    }

    /*
      Find logged-in user's business
    */
    const [users] = await db.promise().query(
      `
      SELECT business_id
      FROM users
      WHERE id = ?
      `,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const businessId = users[0].business_id;

    const businessData = {
      business_name: business_name.trim(),
      owner_name: owner_name.trim(),
      mobile: mobile.trim(),
      email: email.trim().toLowerCase(),
      address: address?.trim() || "",
      gst_number: gst_number?.trim().toUpperCase() || "",
      pan_number: pan_number?.trim().toUpperCase() || "",
      business_type: business_type?.trim() || "",
      state: state?.trim() || "",
      logo: logo?.trim() || "",
      invoice_prefix:
        invoice_prefix?.trim().toUpperCase() || "INV",
    };

    /*
      UPDATE
    */
    if (businessId) {
      const business = await updateBusiness(
        businessId,
        businessData
      );

      return res.status(200).json({
        message: "Business details updated successfully.",
        business,
      });
    }

    /*
      CREATE
    */
    const newBusinessId = await createBusiness(
      businessData
    );

    /*
      Connect business to logged-in user
    */
    await db.promise().query(
      `
      UPDATE users
      SET business_id = ?
      WHERE id = ?
      `,
      [newBusinessId, userId]
    );

    const business = await getBusinessById(
      newBusinessId
    );

    return res.status(201).json({
      message: "Business details saved successfully.",
      business,
    });
  } catch (error) {
    console.error("Save Business Error:", error);

    return res.status(500).json({
      message: "Failed to save business details.",
    });
  }
};

module.exports = {
  getBusiness,
  saveBusiness,
};