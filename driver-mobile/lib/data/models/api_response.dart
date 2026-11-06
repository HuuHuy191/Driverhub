class ApiResponse<T> {
  const ApiResponse({required this.data, required this.timestamp});

  final T data;
  final DateTime timestamp;

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object? json) parseData,
  ) {
    return ApiResponse(
      data: parseData(json['data']),
      timestamp: DateTime.parse(json['timestamp'] as String).toUtc(),
    );
  }
}

class PaginatedResponse<T> {
  const PaginatedResponse({
    required this.data,
    required this.meta,
    required this.timestamp,
  });

  final List<T> data;
  final PaginationMeta meta;
  final DateTime timestamp;

  factory PaginatedResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object? json) parseItem,
  ) {
    final items = json['data'] as List<dynamic>? ?? const [];
    return PaginatedResponse(
      data: items.map(parseItem).toList(growable: false),
      meta: PaginationMeta.fromJson(
        Map<String, dynamic>.from(json['meta'] as Map),
      ),
      timestamp: DateTime.parse(json['timestamp'] as String).toUtc(),
    );
  }
}

class PaginationMeta {
  const PaginationMeta({
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
  });

  final int page;
  final int limit;
  final int total;
  final int totalPages;

  factory PaginationMeta.fromJson(Map<String, dynamic> json) {
    return PaginationMeta(
      page: (json['page'] as num).toInt(),
      limit: (json['limit'] as num).toInt(),
      total: (json['total'] as num).toInt(),
      totalPages: (json['totalPages'] as num).toInt(),
    );
  }
}
