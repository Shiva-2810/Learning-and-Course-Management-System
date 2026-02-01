import jwt from "jsonwebtoken";

export const generateToken = (res, user, message) => {
   console.log("Key used to SIGN token:", process.env.SECRET_KEY);
  const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY, {
    expiresIn: "1d",
  });
  console.log("Token created:", token); // Log the newly created token
  return res
    .status(200)
    .cookie("token", token, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    }).json({
        success:true,
        message,
        user
    });
};
