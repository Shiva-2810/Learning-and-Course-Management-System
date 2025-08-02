import Stripe from "stripe";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { Lecture } from "../models/lecture.model.js";
import { User } from "../models/user.model.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); //creating new stripe object using our secret key

export const createCheckoutSession = async (req, res) => {
  try {
    const userId = req.id;
    const { courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found!" });

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: course.courseTitle,
              images: [course.courseThumbnail],
            },
            unit_amount: course.coursePrice * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: 'http://localhost:5173/payment-success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: `http://localhost:5173/course-detail/${courseId}`,
      metadata: {
        courseId,
        userId,
      },
      shipping_address_collection: {
        allowed_countries: ["IN"],
      },
    });

    return res.status(200).json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.log("Error creating checkout session:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


export const stripeWebhook = async (req, res) => {
  let event;

  try {
    // const payloadString = JSON.stringify(req.body, null, 2);
    const secret = process.env.WEBHOOK_ENDPOINT_SECRET;
    const sig = req.headers["stripe-signature"];

    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (error) {
    console.error("Webhook error:", error.message);
    return res.status(400).send(`Webhook error: ${error.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      const existing = await CoursePurchase.findOne({ paymentId: session.id });

      if (existing && existing.status === "completed") {
        return res.status(200).send(); // already handled
      }

      const courseId = session.metadata.courseId;
      const userId = session.metadata.userId;

      const newPurchase = new CoursePurchase({
        courseId,
        userId,
        paymentId: session.id,
        amount: session.amount_total / 100,
        status: "completed",
      });

      await newPurchase.save();

      // Make all lectures visible
      const course = await Course.findById(courseId);
      if (course?.lectures?.length > 0) {
        await Lecture.updateMany(
          { _id: { $in: course.lectures } },
          { $set: { isPreviewFree: true } }
        );
      }

      // Update user and course
      await User.findByIdAndUpdate(
        userId,
        { $addToSet: { enrolledCourses: courseId } },
        { new: true }
      );

      await Course.findByIdAndUpdate(
        courseId,
        { $addToSet: { enrolledStudents: userId } },
        { new: true }
      );
    } catch (err) {
      console.error("Error processing checkout.session.completed:", err);
      return res.status(500).send("Webhook handling failed");
    }
  }

  res.status(200).send(); // Success for Stripe
};

export const getCourseDetailWithPurchaseStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    const course = await Course.findById(courseId)
      .populate({ path: "creator" })
      .populate({ path: "lectures" });

    const purchased = await CoursePurchase.findOne({
      userId,
      courseId,
      status: "completed"
    });
    console.log(purchased);

    if (!course) {
      return res.status(404).json({ message: "course not found!" });
    }

    return res.status(200).json({
      course,
      purchased: !!purchased, // true if purchased, false otherwise
    });
  } catch (error) {
    console.log(error);
  }
};


export const getAllPurchasedCourse = async (_, res) => {
  try {
    const purchasedCourse = await CoursePurchase.find({
      status: "completed",
    }).populate("courseId");
    if (!purchasedCourse) {
      return res.status(404).json({
        purchasedCourse: [],
      });
    }
    return res.status(200).json({
      purchasedCourse,
    });
  } catch (error) {
    console.log(error);
  }
};
