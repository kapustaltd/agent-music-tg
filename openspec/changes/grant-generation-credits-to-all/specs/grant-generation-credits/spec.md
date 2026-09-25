# grant-generation-credits Specification

## ADDED Requirements

### Requirement: Admin can grant ten generation credits to all users

The Mini App admin panel SHALL provide a confirmation-gated action that adds
exactly 10 paid generation credits to every registered user in `users`.

#### Scenario: Confirmed bulk grant

- **WHEN** an authenticated administrator confirms the bulk grant
- **THEN** every registered user receives 10 additional paid credits, the
  operation response reports the number of updated users, and each grant is
  recorded in `grant_history` with the administrator as `granted_by`

#### Scenario: Bulk grant is atomic

- **WHEN** writing a user balance or its grant history fails
- **THEN** the transaction does not leave a partial bulk grant

#### Scenario: Non-admin cannot bulk grant

- **WHEN** a non-admin calls the bulk-grant endpoint
- **THEN** the server returns HTTP 403 and no user balance changes

#### Scenario: Repeated confirmed grants are explicit

- **WHEN** an administrator confirms the action again
- **THEN** it is treated as a new grant of 10 credits and the UI requires a new
  confirmation before sending it
