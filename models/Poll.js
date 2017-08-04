const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
    title: String,
	createdBy: String,
	choices: [
	    {choice: { type: String, required: true }, count: { type: Number, default: 0 }}
	],
	whoVoted: [{ type: String, unique: true }]
}, { timestamps: true });

const Poll = mongoose.model('Poll', pollSchema);

module.exports = Poll;
