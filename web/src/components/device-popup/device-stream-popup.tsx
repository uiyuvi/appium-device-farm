import React, { useEffect, useState } from 'react';
import { IDevice } from '../../interfaces/IDevice';
import './device-stream-popup.css';

interface IDeviceStreamPopupProps {
  onClose: () => void;
  devices: IDevice[];
}

function DeviceStreamPopup(props: IDeviceStreamPopupProps) {
  const { onClose, devices } = props;
  const [activeDevice, setActiveDevice] = useState<IDevice>();

  useEffect(() => {
    if (devices.length === 1) {
      setActiveDevice(devices[0]);
    }
  }, [devices]);

  const streamUrl = (device: IDevice) => {
    const devicePort = device.adbPort || device.mjpegServerPort || 0;
    const portInHost = device.host.split(':')[2];
    const newHost = portInHost
      ? device.host.replace(portInHost, devicePort.toString())
      : device.host + ':' + devicePort;

    return newHost;
  };

  return (
    <>
      {activeDevice && (
        <div className="device-stream-popup-container">
          <div className="device-stream-popup">
            <div className="device-stream-popup-header">
              <div className="device-stream-popup-header__title">{activeDevice.name}</div>
              <div className="device-stream-popup-header__close" onClick={onClose}>
                &times;
              </div>
            </div>
            <iframe src={streamUrl(activeDevice)} className="device-stream-popup-content__embed" />
          </div>
        </div>
      )}
    </>
  );
}

export default DeviceStreamPopup;
