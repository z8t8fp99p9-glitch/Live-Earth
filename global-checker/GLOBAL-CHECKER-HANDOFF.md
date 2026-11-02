# Global Checker — build handoff

- Existing central Checker retained: `global-checker/global_checker.py`.
- New additive review APIs: `global-checker/global_checker_workflow.py`.
- Main APIs: `review_collection_batch(...)`, `review_editorial_package(...)`.
- Optional audit APIs: `ensure_workflow_audit_table(...)`, `record_workflow_reviews(...)`, `prune_workflow_reviews(...)`.
- Reuses the existing Global Checker policy engine and single source-policy registry.
- Missing permission dimensions are UNKNOWN; old generic `allowStorage`/`allowDisplay` are not stretched to mean derived/raw permissions.
- Does not modify current `.pth` bootstrap, runner, workflow YAML, Collector, Publisher, DB, cache, feed or app.
- Does not run tests. Tests will be conducted after the remaining Newsroom systems are built.
