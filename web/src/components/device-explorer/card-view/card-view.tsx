import React from 'react';
import { IDevice } from '../../../interfaces/IDevice';
import DeviceCard from '../../device-card/device-card/device-card';
import DeviceStreamPopup from '../../device-card/device-card/device-stream-popup';
import './card-view.css';

interface IProps {
  devices: Array<IDevice>;
  reloadDevices: () => void;
}

export default class CardView extends React.Component<IProps, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      streamingDevice: {
        isVisible: false,
        streamUrl: undefined,
        deviceName: undefined,
      },
    };
  }

  streamingDevice = (device?: IDevice) => {
    if (device) {
      const devicePort = device.adbPort || device.mjpegServerPort || 0;
      const portInHost = device.host.split(':')[2];
      const newHost = portInHost
        ? device.host.replace(portInHost, devicePort.toString())
        : device.host + ':' + devicePort;

      this.setState({
        streamingDevice: {
          isVisible: true,
          streamUrl: newHost,
          deviceName: device.name,
        },
      });
    } else {
      this.setState({
        streamingDevice: {
          isVisible: false,
          streamUrl: undefined,
          deviceName: undefined,
        },
      });
    }
  };

  render() {
    return (
      <>
        <div className="device-explorer-card-container">
          {React.Children.toArray(
            this.props.devices.map((device, i) => (
              <DeviceCard
                device={device}
                reloadDevices={this.props.reloadDevices}
                streamDevice={this.streamingDevice}
              />
            ))
          )}
        </div>
        <DeviceStreamPopup {...this.state.streamingDevice} onClose={() => this.streamingDevice()} />
      </>
    );
  }
}
