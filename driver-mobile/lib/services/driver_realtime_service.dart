import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as socket_io;

import '../core/config/app_config.dart';

final driverRealtimeServiceProvider = Provider<DriverRealtimeService>((ref) {
  final service = DriverRealtimeService();
  ref.onDispose(service.dispose);
  return service;
});

class DriverRealtimeEvent {
  const DriverRealtimeEvent(this.name, this.data);

  final String name;
  final Map<String, dynamic> data;
}

class DriverRealtimeService {
  final _events = StreamController<DriverRealtimeEvent>.broadcast();
  final _connectionStates = StreamController<bool>.broadcast();
  socket_io.Socket? _socket;
  Timer? _heartbeatTimer;

  Stream<DriverRealtimeEvent> get events => _events.stream;
  Stream<bool> get connectionStates => _connectionStates.stream;
  bool get isConnected => _socket?.connected ?? false;

  void connect(String accessToken) {
    if (_socket?.connected == true) return;
    _socket?.dispose();
    _socket = socket_io.io(
      AppConfig.socketUrl,
      socket_io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': accessToken})
          .enableReconnection()
          .disableAutoConnect()
          .build(),
    );

    _socket!
      ..onConnect((_) {
        _connectionStates.add(true);
        _heartbeatTimer?.cancel();
        _heartbeatTimer = Timer.periodic(
          const Duration(seconds: 60),
          (_) => _socket?.emit('driver:heartbeat', const {}),
        );
      })
      ..onDisconnect((_) {
        _connectionStates.add(false);
        _heartbeatTimer?.cancel();
      })
      ..onConnectError((_) => _connectionStates.add(false))
      ..on('ride:offer', (data) => _addEvent('ride:offer', data))
      ..on(
        'ride:offer_expired',
        (data) => _addEvent('ride:offer_expired', data),
      )
      ..on('ride:offer_taken', (data) => _addEvent('ride:offer_taken', data))
      ..on('ride:assigned', (data) => _addEvent('ride:assigned', data))
      ..on('ride:cancelled', (data) => _addEvent('ride:cancelled', data))
      ..on('wallet:updated', (data) => _addEvent('wallet:updated', data))
      ..on(
        'notification:new',
        (data) => _addEvent('notification:new', data),
      )
      ..on('driver:force_offline', (data) {
        _addEvent('driver:force_offline', data);
      })
      ..connect();
  }

  void sendLocation({
    required double latitude,
    required double longitude,
    double? heading,
    double? speed,
  }) {
    _socket?.emit('driver:location', {
      'latitude': latitude,
      'longitude': longitude,
      'heading': ?heading,
      'speed': ?speed,
    });
  }

  void markOfferViewed(String offerId) {
    _socket?.emit('offer:viewed', {'offerId': offerId});
  }

  void _addEvent(String name, dynamic data) {
    if (data is Map) {
      _events.add(DriverRealtimeEvent(name, Map<String, dynamic>.from(data)));
    }
  }

  void disconnect() {
    _heartbeatTimer?.cancel();
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _connectionStates.add(false);
  }

  void dispose() {
    disconnect();
    _events.close();
    _connectionStates.close();
  }
}
