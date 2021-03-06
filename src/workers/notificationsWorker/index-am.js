import ResortService from '../../services/ResortService';
import UserDeviceService from '../../services/UserDeviceService';
import NotificationService from '../../services/NotificationService';
import { extractFirstNameFromDeviceName } from './extractFirstNameFromDeviceName';

// 3600 is an hour in epoch time
const EPOCH_HOUR = 3600;

const generateMessage = (userDevice, freshSnow = false) => {
  const firstName = extractFirstNameFromDeviceName(userDevice.deviceName);
  // 5PM-4AM
  //      has name? Another night of snow, Julia. We sure hope you waxed your gears.
  //          else: Woah! More snow overnight! We sure hope you waxed your gears.
  // 4AM-5AM
  //      has name? High five, Julia! It's snowing in Tahoe.
  //          else: Yay! It's snowing in Tahoe.

  let greeting = freshSnow ? 'Yay!' : 'Woah more snow overnight!'

  if (firstName) {
    greeting = freshSnow ? `High five ${firstName}!` : `Another night of snow, ${firstName}!`;
  }

  const freshSnowMessage = `${greeting} It's snowing in Tahoe. ❄️`
  const defaultMessage = `${greeting} We sure hope you waxed your gears.`

  const message = freshSnow ? freshSnowMessage : defaultMessage;
  return message;
}

const run = async (metadata) => {

  const resortService = new ResortService();
  const lastSnow = await resortService.getSnowMetadata();

  if (lastSnow.snowLastSeen) {
    await resortService.setSnowMetadata({
      snowLastSeen: null,
    });

    const userDeviceService = new UserDeviceService();
    const userDevices = await userDeviceService.getUserDevices();

    const now = new Date();
    const epoch = now.getTime();

    const snowedWithinAnHour = Math.abs(epoch - lastSnow.snowLastSeen) <= EPOCH_HOUR;

    // Construct a message (see https://docs.expo.io/versions/latest/guides/push-notifications.html)
    const notifications = userDevices.map(userDevice => {
      const message = generateMessage(userDevice, snowedWithinAnHour);

      return ({
        to: userDevice.notificationToken,
        sound: 'default',
        body: message,
        data: { withSome: 'data' },
      })
    });

    const notificationService = new NotificationService();
    const receipts = await notificationService.broadcast(notifications);

    console.log(receipts);

    return receipts;
  }
};

run();
