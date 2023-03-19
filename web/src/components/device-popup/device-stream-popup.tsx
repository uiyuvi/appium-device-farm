import React, { useEffect, useState } from 'react';
import { IDevice } from '../../interfaces/IDevice';
import './device-stream-popup.css';

interface IDeviceStreamPopupProps {
  onClose: () => void;
  devices: IDevice[];
  activeStreamingDevice?: IDevice;
}

function DeviceStreamPopup(props: IDeviceStreamPopupProps) {
  const { onClose, devices, activeStreamingDevice } = props;
  const [activeDevice, setActiveDevice] = useState<IDevice>();

  useEffect(() => {
    if (activeStreamingDevice) {
      setActiveDevice(activeStreamingDevice);
    }
  }, [activeStreamingDevice]);

  const streamUrl = (device: IDevice) => {
    const devicePort = device.adbPort || device.mjpegServerPort || 0;
    const portInHost = device.host.split(':')[2];
    const newHost = portInHost
      ? device.host.replace(portInHost, devicePort.toString())
      : device.host + ':' + devicePort;

    return newHost;
  };

  const filterActiveSessionDevices = (devices: IDevice[]) => {
    return devices.filter((device) => device.busy && !device.userBlocked);
  };

  return (
    <div className="device-stream-popup-container">
      {activeDevice ? (
        <div className="device-stream-popup">
          <div className="device-stream-popup-header">
            <div className="device-stream-popup-header__title-container">
              <div className="device-stream-popup-header__title">{activeDevice.name}</div>
              <button
                onClick={() => setActiveDevice(undefined)}
                className="device-stream-popup-header__button"
              >
                View Active Devices
              </button>
            </div>
            <button className="device-stream-popup-header__close" onClick={onClose}>
              &times;
            </button>
          </div>
          <iframe
            src={streamUrl(activeDevice)}
            className="device-stream-popup-content__embed__single"
          />
        </div>
      ) : (
        <div className="device-stream-popup">
          <div className="device-stream-popup-header">
            <div className="device-stream-popup-header__title">
              Active Session Devices ({filterActiveSessionDevices(devices).length})
            </div>
            <div className="device-stream-popup-header__close" onClick={onClose}>
              &times;
            </div>
          </div>
          <div className="device-stream-popup-content__devices">
            {filterActiveSessionDevices(devices).map((device) => (
              <div
                key={device.udid}
                onClick={() => setActiveDevice(device)}
                className="device-stream-popup-content__device"
              >
                <p className="device-stream-popup-content__devices__name">{device.name}</p>
                <iframe
                  src={streamUrl(device)}
                  className="device-stream-popup-content__embed__multiple"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DeviceStreamPopup;
