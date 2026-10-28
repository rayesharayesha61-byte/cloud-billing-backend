const db = require("../config/db");

// GET BUSINESS BY USER ID
const getBusinessByUserId = async (userId) => {
  const [rows] = await db.promise().query(
    `
    SELECT
      id,
      user_id,
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
      created_at,
      updated_at
    FROM businesses
    WHERE user_id = ?
    LIMIT 1
    `,
    [userId]
  );

  return rows.length > 0 ? rows[0] : null;
};


// CREATE BUSINESS
const createBusiness = async (userId, businessData) => {
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
  } = businessData;

  const [result] = await db.promise().query(
    `
    INSERT INTO businesses
    (
      user_id,
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
      invoice_prefix
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      userId,
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
    ]
  );

  return result.insertId;
};


// UPDATE BUSINESS
const updateBusiness = async (
  userId,
  businessData
) => {
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
  } = businessData;

  await db.promise().query(
    `
    UPDATE businesses
    SET
      business_name = ?,
      owner_name = ?,
      mobile = ?,
      email = ?,
      address = ?,
      gst_number = ?,
      pan_number = ?,
      business_type = ?,
      state = ?,
      logo = ?,
      invoice_prefix = ?
    WHERE user_id = ?
    `,
    [
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
      userId,
    ]
  );

  return getBusinessByUserId(userId);
};


module.exports = {
  getBusinessByUserId,
  createBusiness,
  updateBusiness,
};