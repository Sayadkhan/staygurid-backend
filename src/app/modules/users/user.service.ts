import mongoose from "mongoose";
import { AdminModel } from "../admin/admin.model";
import { verifyToken } from "../auth/auth.utils";
import { ClientModel } from "../client/client.model";

const getMe = async (token: string) => {
  const decoded = verifyToken(token);
  const { email, role } = decoded;

  let result = null;

  if (role === "client") {
    // Use aggregation pipeline for client to get booking and payment info
    result = await ClientModel.aggregate([
      // Match the client by email
      {
        $match: { email: email },
      },
      // Populate user details
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: "$userDetails",
      },
      // Get all bookings for this client
      {
        $lookup: {
          from: "bookings",
          let: { clientEmail: "$email" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$email", "$$clientEmail"] },
              },
            },
            // Get payment information for each booking
            {
              $lookup: {
                from: "payments",
                let: { bookingTrxId: "$trxId" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$trxId", "$$bookingTrxId"] },
                    },
                  },
                  {
                    $project: {
                      _id: 1,
                      paymentStatus: 1,
                      summary: 1,
                      individualItems: 1,
                      createdAt: 1,
                      updatedAt: 1,
                    },
                  },
                ],
                as: "paymentDetails",
              },
            },
            {
              $addFields: {
                paymentInfo: { $arrayElemAt: ["$paymentDetails", 0] },
                totalSpots: { $size: "$bookedSpots" },
                totalAmount: {
                  $sum: {
                    $map: {
                      input: "$bookedSpots",
                      as: "spot",
                      in: { $toDouble: "$$spot.totalPrice" },
                    },
                  },
                },
              },
            },
            {
              $sort: { createdAt: -1 },
            },
            {
              $project: {
                paymentDetails: 0,
              },
            },
          ],
          as: "bookings",
        },
      },
      // Calculate statistics
      {
        $addFields: {
          fullName: {
            $concat: [
              "$name.firstName",
              " ",
              { $ifNull: ["$name.middleName", ""] },
              " ",
              "$name.lastName",
            ],
          },
          statistics: {
            totalBookings: { $size: "$bookings" },
            totalSpots: {
              $sum: {
                $map: {
                  input: "$bookings",
                  as: "booking",
                  in: "$$booking.totalSpots",
                },
              },
            },
            totalSpent: {
              $sum: {
                $map: {
                  input: "$bookings",
                  as: "booking",
                  in: "$$booking.totalAmount",
                },
              },
            },
            successfulBookings: {
              $size: {
                $filter: {
                  input: "$bookings",
                  as: "booking",
                  cond: { $eq: ["$$booking.paymentStatus", "success"] },
                },
              },
            },
            pendingBookings: {
              $size: {
                $filter: {
                  input: "$bookings",
                  as: "booking",
                  cond: { $eq: ["$$booking.paymentStatus", "pending"] },
                },
              },
            },
          },
          // Group bookings by status for easy access
          groupedBookings: {
            successful: {
              $filter: {
                input: "$bookings",
                as: "booking",
                cond: { $eq: ["$$booking.paymentStatus", "success"] },
              },
            },
            pending: {
              $filter: {
                input: "$bookings",
                as: "booking",
                cond: { $eq: ["$$booking.paymentStatus", "pending"] },
              },
            },
          },
        },
      },
      // Format the output
      {
        $project: {
          _id: 1,
          email: 1,
          fullName: 1,
          age: 1,
          gender: 1,
          image: 1,
          user: {
            _id: "$userDetails._id",
            email: "$userDetails.email",
            role: "$userDetails.role",
            status: "$userDetails.status",
            createdAt: "$userDetails.createdAt",
            updatedAt: "$userDetails.updatedAt",
          },
          statistics: {
            totalBookings: "$statistics.totalBookings",
            totalSpots: "$statistics.totalSpots",
            totalSpent: { $round: ["$statistics.totalSpent", 2] },
            successfulBookings: "$statistics.successfulBookings",
            pendingBookings: "$statistics.pendingBookings",
          },
          bookings: {
            $map: {
              input: {
                $reverseArray: {
                  $slice: ["$bookings", 20],
                },
              },
              as: "booking",
              in: {
                _id: "$$booking._id",
                trxId: "$$booking.trxId",
                paymentStatus: "$$booking.paymentStatus",
                totalSpots: "$$booking.totalSpots",
                totalAmount: { $round: ["$$booking.totalAmount", 2] },
                paymentDetails: "$$booking.paymentInfo",
                spots: "$$booking.bookedSpots",
                createdAt: "$$booking.createdAt",
                updatedAt: "$$booking.updatedAt",
              },
            },
          },
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    // Since aggregate returns an array, get the first element
    result = result.length > 0 ? result[0] : null;
  }

  if (role === "admin") {
    result = await AdminModel.findOne({ email }).populate("user");
  }

  return result;
};

const getAllUsersFromDB = async () => {
  const result = await ClientModel.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    {
      $unwind: {
        path: "$userDetails",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $lookup: {
        from: "bookings",
        let: { clientEmail: "$email" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$email", "$$clientEmail"],
              },
            },
          },

          {
            $lookup: {
              from: "payments",
              let: { bookingTrxId: "$trxId" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$trxId", "$$bookingTrxId"],
                    },
                  },
                },
                {
                  $project: {
                    _id: 1,
                    paymentStatus: 1,
                    summary: 1,
                    individualItems: 1,
                    createdAt: 1,
                    updatedAt: 1,
                  },
                },
              ],
              as: "paymentDetails",
            },
          },
          {
            $addFields: {
              paymentInfo: { $arrayElemAt: ["$paymentDetails", 0] },
              totalSpotsInBooking: { $size: "$bookedSpots" },
              totalAmountInBooking: {
                $sum: {
                  $map: {
                    input: "$bookedSpots",
                    as: "spot",
                    in: { $toDouble: "$$spot.totalPrice" },
                  },
                },
              },
            },
          },
          {
            $sort: { createdAt: -1 },
          },
          {
            $project: {
              paymentDetails: 0,
            },
          },
        ],
        as: "bookings",
      },
    },

    {
      $addFields: {
        totalBookings: { $size: "$bookings" },
        totalSpotsBooked: {
          $sum: "$bookings.totalSpotsInBooking",
        },
        totalAmountSpent: {
          $sum: "$bookings.totalAmountInBooking",
        },

        totalPaidAmount: {
          $sum: {
            $map: {
              input: "$bookings",
              as: "booking",
              in: {
                $cond: {
                  if: {
                    $and: [
                      "$$booking.paymentInfo",
                      { $eq: ["$$booking.paymentStatus", "success"] },
                    ],
                  },
                  then: {
                    $ifNull: ["$$booking.paymentInfo.summary.payableAmount", 0],
                  },
                  else: 0,
                },
              },
            },
          },
        },
        totalDueAmount: {
          $sum: {
            $map: {
              input: "$bookings",
              as: "booking",
              in: {
                $cond: {
                  if: {
                    $and: [
                      "$$booking.paymentInfo",
                      { $eq: ["$$booking.paymentStatus", "pending"] },
                    ],
                  },
                  then: {
                    $ifNull: ["$$booking.paymentInfo.summary.remainingDue", 0],
                  },
                  else: 0,
                },
              },
            },
          },
        },
        successfulBookings: {
          $size: {
            $filter: {
              input: "$bookings",
              as: "booking",
              cond: { $eq: ["$$booking.paymentStatus", "success"] },
            },
          },
        },
        pendingBookings: {
          $size: {
            $filter: {
              input: "$bookings",
              as: "booking",
              cond: { $eq: ["$$booking.paymentStatus", "pending"] },
            },
          },
        },

        fullName: {
          $concat: [
            "$name.firstName",
            " ",
            { $ifNull: ["$name.middleName", ""] },
            " ",
            "$name.lastName",
          ],
        },
      },
    },

    {
      $project: {
        _id: 1,
        email: 1,
        fullName: 1,
        age: 1,
        gender: 1,
        image: 1,
        userDetails: {
          _id: 1,
          email: 1,
        },

        bookingStatistics: {
          totalBookings: 1,
          totalSpotsBooked: 1,
          totalAmountSpent: { $round: ["$totalAmountSpent", 2] },
          totalPaidAmount: { $round: ["$totalPaidAmount", 2] },
          totalDueAmount: { $round: ["$totalDueAmount", 2] },
          successfulBookings: 1,
          pendingBookings: 1,
        },

        recentBookings: {
          $map: {
            input: { $slice: ["$bookings", 3] },
            as: "booking",
            in: {
              _id: "$$booking._id",
              trxId: "$$booking.trxId",
              paymentStatus: "$$booking.paymentStatus",
              totalSpots: "$$booking.totalSpotsInBooking",
              totalAmount: { $round: ["$$booking.totalAmountInBooking", 2] },
              paymentInfo: {
                status: "$$booking.paymentInfo.paymentStatus",
                summary: "$$booking.paymentInfo.summary",
                individualItems: "$$booking.paymentInfo.individualItems",
              },
              spots: "$$booking.bookedSpots",
              createdAt: "$$booking.createdAt",
              updatedAt: "$$booking.updatedAt",
            },
          },
        },

        allBookings: {
          $map: {
            input: "$bookings",
            as: "booking",
            in: {
              _id: "$$booking._id",
              trxId: "$$booking.trxId",
              paymentStatus: "$$booking.paymentStatus",
              totalSpots: "$$booking.totalSpotsInBooking",
              totalAmount: { $round: ["$$booking.totalAmountInBooking", 2] },
              paymentDetails: "$$booking.paymentInfo",
              spots: "$$booking.bookedSpots",
              createdAt: "$$booking.createdAt",
            },
          },
        },
        createdAt: 1,
      },
    },
    {
      $sort: {
        "bookingStatistics.totalBookings": -1,
        "bookingStatistics.totalAmountSpent": -1,
      },
    },
  ]);

  return result;
};

const getSingleUserDataFromDB = async (id: string) => {
  const result = await ClientModel.aggregate([
    // Match client by _id
    {
      $match: {
        _id: new mongoose.Types.ObjectId(id),
      },
    },
    // Populate user details
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    {
      $unwind: {
        path: "$userDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    // Get all bookings for this client
    {
      $lookup: {
        from: "bookings",
        let: { clientEmail: "$email" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$email", "$$clientEmail"] },
            },
          },
          // Get payment information for each booking
          {
            $lookup: {
              from: "payments",
              let: { bookingTrxId: "$trxId" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$trxId", "$$bookingTrxId"] },
                  },
                },
                {
                  $project: {
                    _id: 1,
                    paymentStatus: 1,
                    summary: 1,
                    individualItems: 1,
                    createdAt: 1,
                    updatedAt: 1,
                  },
                },
              ],
              as: "paymentDetails",
            },
          },
          // Get spot details for each booked spot
          {
            $lookup: {
              from: "spots",
              let: { spotIds: "$bookedSpots.spot" },
              pipeline: [
                {
                  $match: {
                    $expr: { $in: ["$_id", "$$spotIds"] },
                  },
                },
              ],
              as: "spotDetails",
            },
          },
          {
            $addFields: {
              paymentInfo: { $arrayElemAt: ["$paymentDetails", 0] },
              totalSpots: { $size: "$bookedSpots" },
              totalAmount: {
                $sum: {
                  $map: {
                    input: "$bookedSpots",
                    as: "spot",
                    in: { $toDouble: "$$spot.totalPrice" },
                  },
                },
              },
              // Enrich booked spots with spot details
              enrichedSpots: {
                $map: {
                  input: "$bookedSpots",
                  as: "bookedSpot",
                  in: {
                    $mergeObjects: [
                      "$$bookedSpot",
                      {
                        spotDetails: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$spotDetails",
                                as: "spot",
                                cond: {
                                  $eq: ["$$spot._id", "$$bookedSpot.spot"],
                                },
                              },
                            },
                            0,
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
          {
            $sort: { createdAt: -1 },
          },
          {
            $project: {
              paymentDetails: 0,
              spotDetails: 0,
              bookedSpots: 0,
            },
          },
        ],
        as: "bookings",
      },
    },
    // Calculate comprehensive statistics
    {
      $addFields: {
        fullName: {
          $concat: [
            "$name.firstName",
            " ",
            { $ifNull: ["$name.middleName", ""] },
            " ",
            "$name.lastName",
          ],
        },
        // Booking statistics
        bookingStats: {
          totalBookings: { $size: "$bookings" },
          totalSpots: {
            $sum: {
              $map: {
                input: "$bookings",
                as: "booking",
                in: "$$booking.totalSpots",
              },
            },
          },
          totalAmount: {
            $sum: {
              $map: {
                input: "$bookings",
                as: "booking",
                in: "$$booking.totalAmount",
              },
            },
          },
          successfulBookings: {
            $size: {
              $filter: {
                input: "$bookings",
                as: "booking",
                cond: { $eq: ["$$booking.paymentStatus", "success"] },
              },
            },
          },
          pendingBookings: {
            $size: {
              $filter: {
                input: "$bookings",
                as: "booking",
                cond: { $eq: ["$$booking.paymentStatus", "pending"] },
              },
            },
          },
        },
        // Payment statistics
        paymentStats: {
          totalPaid: {
            $sum: {
              $map: {
                input: "$bookings",
                as: "booking",
                in: {
                  $cond: {
                    if: {
                      $and: [
                        "$$booking.paymentInfo",
                        { $eq: ["$$booking.paymentStatus", "success"] },
                      ],
                    },
                    then: {
                      $ifNull: [
                        "$$booking.paymentInfo.summary.payableAmount",
                        0,
                      ],
                    },
                    else: 0,
                  },
                },
              },
            },
          },
          totalDue: {
            $sum: {
              $map: {
                input: "$bookings",
                as: "booking",
                in: {
                  $cond: {
                    if: {
                      $and: [
                        "$$booking.paymentInfo",
                        { $eq: ["$$booking.paymentStatus", "pending"] },
                      ],
                    },
                    then: {
                      $ifNull: [
                        "$$booking.paymentInfo.summary.remainingDue",
                        0,
                      ],
                    },
                    else: 0,
                  },
                },
              },
            },
          },
        },
        // Group bookings by status
        groupedBookings: {
          success: {
            $filter: {
              input: "$bookings",
              as: "booking",
              cond: { $eq: ["$$booking.paymentStatus", "success"] },
            },
          },
          pending: {
            $filter: {
              input: "$bookings",
              as: "booking",
              cond: { $eq: ["$$booking.paymentStatus", "pending"] },
            },
          },
        },
        // Recent activity
        lastActivity: {
          $max: "$bookings.createdAt",
        },
      },
    },
    // Format the output
    {
      $project: {
        _id: 1,
        email: 1,
        fullName: 1,
        age: 1,
        gender: 1,
        image: 1,
        // User information (without password)
        user: {
          _id: "$userDetails._id",
          email: "$userDetails.email",
          role: "$userDetails.role",
          status: "$userDetails.status",
          createdAt: "$userDetails.createdAt",
          updatedAt: "$userDetails.updatedAt",
        },
        // Statistics
        statistics: {
          bookings: "$bookingStats",
          payments: {
            totalPaid: { $round: ["$paymentStats.totalPaid", 2] },
            totalDue: { $round: ["$paymentStats.totalDue", 2] },
            netBalance: {
              $round: [
                {
                  $subtract: [
                    { $ifNull: ["$paymentStats.totalPaid", 0] },
                    { $ifNull: ["$paymentStats.totalDue", 0] },
                  ],
                },
                2,
              ],
            },
          },
          activity: {
            lastActivity: "$lastActivity",
            accountAge: {
              $divide: [
                { $subtract: [new Date(), "$userDetails.createdAt"] },
                1000 * 60 * 60 * 24, // Convert to days
              ],
            },
          },
        },
        // All bookings with detailed information
        allBookings: {
          $map: {
            input: "$bookings",
            as: "booking",
            in: {
              _id: "$$booking._id",
              trxId: "$$booking.trxId",
              paymentStatus: "$$booking.paymentStatus",
              passport: "$$booking.passport",
              pickupLocation: "$$booking.pickupLocation",
              whatsapp: "$$booking.whatsapp",
              totalSpots: "$$booking.totalSpots",
              totalAmount: { $round: ["$$booking.totalAmount", 2] },
              paymentDetails: {
                status: "$$booking.paymentInfo.paymentStatus",
                summary: "$$booking.paymentInfo.summary",
                items: "$$booking.paymentInfo.individualItems",
                createdAt: "$$booking.paymentInfo.createdAt",
              },
              spots: "$$booking.enrichedSpots",
              createdAt: "$$booking.createdAt",
              updatedAt: "$$booking.updatedAt",
            },
          },
        },
        // Recent bookings (last 5)
        recentBookings: {
          $slice: ["$bookings", 5],
        },
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  return result.length > 0 ? result[0] : null;
};

const upDateMe = async (
  token: string,
  payload: {
    email: string;
    name: { firstName: string; middleName?: string; lastName: string };
  }
) => {
  const decoded = verifyToken(token);
  const { email } = decoded;
  console.log(payload);

  const result = await AdminModel.findOneAndUpdate({ email }, payload);
  return result;
};

export const UserServices = {
  getMe,
  getAllUsersFromDB,
  getSingleUserDataFromDB,
  upDateMe,
};
