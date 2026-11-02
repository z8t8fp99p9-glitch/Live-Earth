class GlobalCollectorError(RuntimeError):
    """Raised when a collection job or its source boundaries are invalid."""


class FeedFetchError(GlobalCollectorError):
    """Raised when an approved source feed cannot be fetched safely."""


class FeedParseError(GlobalCollectorError):
    """Raised when an approved feed is malformed or unsupported."""
