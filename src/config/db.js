const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Pass retryWrites: false as the second argument option
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            retryWrites: false
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;