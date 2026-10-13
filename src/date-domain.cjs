function localDate(date = new Date()) {
	const offset = date.getTimezoneOffset() * 60_000;
	return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function addDays(date, amount) {
	const next = new Date(`${date}T00:00:00`);
	next.setDate(next.getDate() + amount);
	return localDate(next);
}

module.exports = { addDays, localDate };
