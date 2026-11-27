class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function fail(status, message) {
  throw new HttpError(status, message);
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) fail(400, 'شناسه نامعتبر است');
  return id;
}

function positiveAmount(value, field, max = 9999999999.99) {
  const amount = Number(value);
  if (value === undefined || value === null || value === '' ||
      !Number.isFinite(amount) || amount <= 0 || amount > max) {
    fail(400, `${field} باید عددی مثبت و معتبر باشد`);
  }
  return Math.round(amount * 100) / 100;
}

function nonEmptyText(value, field, min = 1, max = 5000) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < min || text.length > max) {
    fail(400, `${field} باید بین ${min} تا ${max} کاراکتر باشد`);
  }
  return text;
}

function optionalText(value, field, max = 150) {
  if (value === undefined || value === null || value === '') return null;
  return nonEmptyText(value, field, 1, max);
}

function idList(value, field) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) fail(400, `${field} باید یک لیست باشد`);
  const ids = [...new Set(value.map(parseId))];
  return ids;
}

function dateOnly(value) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    fail(400, 'تاریخ تحویل نامعتبر است');
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    fail(400, 'تاریخ تحویل نامعتبر است');
  }
  const today = new Date().toISOString().slice(0, 10);
  if (value < today) fail(400, 'تاریخ تحویل نباید در گذشته باشد');
  return value;
}

module.exports = {
  HttpError, asyncHandler, fail, parseId,
  positiveAmount, nonEmptyText, optionalText, idList, dateOnly,
};
