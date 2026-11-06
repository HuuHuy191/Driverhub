import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/api_client.dart';
import '../models/wallet_models.dart';

final walletRepositoryProvider = Provider<WalletRepository>(
  (ref) => WalletRepository(ref.watch(apiClientProvider)),
);

class WalletRepository {
  WalletRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<WalletModel> getWallet() async {
    final response = await _apiClient.get<Map<String, dynamic>>('/wallet');
    return WalletModel.fromJson(
      Map<String, dynamic>.from(response.data!['data'] as Map),
    );
  }

  Future<({List<WalletTransactionModel> transactions, int totalPages})>
  getTransactions({int page = 1, String? type}) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/wallet/transactions',
      queryParameters: {'page': page, 'limit': 20, 'type': ?type},
    );
    final body = response.data!;
    return (
      transactions: (body['data'] as List<dynamic>)
          .map(
            (item) => WalletTransactionModel.fromJson(
              Map<String, dynamic>.from(item as Map),
            ),
          )
          .toList(growable: false),
      totalPages: ((body['meta'] as Map)['totalPages'] as num).toInt(),
    );
  }

  Future<List<TopupRequestModel>> getTopupRequests() async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/wallet/topup',
      queryParameters: {'page': 1, 'limit': 20},
    );
    return (response.data!['data'] as List<dynamic>)
        .map(
          (item) => TopupRequestModel.fromJson(
            Map<String, dynamic>.from(item as Map),
          ),
        )
        .toList(growable: false);
  }

  Future<TopupRequestModel> createTopup({
    required int amount,
    File? receipt,
  }) async {
    final fields = <String, dynamic>{'amount': amount};
    if (receipt != null) {
      fields['file'] = await MultipartFile.fromFile(receipt.path);
    }
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/wallet/topup',
      data: FormData.fromMap(fields),
    );
    return TopupRequestModel.fromJson(
      Map<String, dynamic>.from(response.data!['data'] as Map),
    );
  }
}
