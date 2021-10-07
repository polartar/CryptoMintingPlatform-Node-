import { Notification, NotificationStatus } from '../models';
import logger from './logger/winston-logger';

class Notify {
  public notifyUser = async (
    userId: string,
    subject: string,
    message: string,
    status: NotificationStatus = NotificationStatus.unread,
  ) => {
    const toInsert: any = {
      userId,
      subject,
      message,
      created: new Date(),
      read: undefined,
      status: status.toString(),
    };
    try {
      Notification.insertMany([toInsert]);
    } catch (err) {
      logger.error(
        'Tried to insert Notification to user, but failed. :: ' +
          JSON.stringify(toInsert),
      );
    }
  };
}

const notify = new Notify();
export default notify;
