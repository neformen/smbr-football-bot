import mongoose, { Schema } from 'mongoose';

const GameRecord = new Schema({
  go: { type: [], required: true },
  skip: { type: [], required: true },
  unconfirmed: { type: [], required: true },
  text: { type: String, required: true },
  chatId: { type: Number, required: true },
  msgId: { type: Number, required: true },
  id: { type: String, required: true }
  // Previos schema name was HistoryItem, but it was changed to GameRecord. Don't change it again.
} , { collection: 'historyitems' });

export default mongoose.model('GameRecord', GameRecord);
