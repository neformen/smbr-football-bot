import { Schema } from "mongoose";
import * as mongoose from "mongoose";


const HistoryItemSchema = new Schema({
    go: { type: [], required: true },
    skip: { type: [], required: true },
    unconfirmed: { type: [], required: true },
    text: { type: String, required: true },
    chatId: { type: Number, required: true },
    msgId: { type: Number, required: true },
    id: { type: String, required: true }
});

export default mongoose.model('HistoryItem', HistoryItemSchema);
