declare module '@twilio/voice-react-native-sdk' {
  export class Voice {
    register(token: string): Promise<void>;
    unregister(): Promise<void>;
    connect(token: string, options?: any): Promise<any>;
  }

  export class Call {
    static Event: {
      Connected: string;
      Disconnected: string;
      ConnectFailure: string;
    };
  }
}
