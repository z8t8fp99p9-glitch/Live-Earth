class GlobalCollectorError(RuntimeError):
    """Raised when a Manager job cannot be safely processed."""


class FetchError(GlobalCollectorError):
    """Raised when a source response cannot be retrieved safely."""


class ParseError(GlobalCollectorError):
    """Raised when a source response cannot be interpreted."""
