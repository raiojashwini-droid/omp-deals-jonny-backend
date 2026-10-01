const EventEmitter = require('events');
class OmpEventEmitter extends EventEmitter {}
const ompEmitter = new OmpEventEmitter();
module.exports = ompEmitter;
