# DSA Battle Platform — Database Documentation

## Overview

This database supports:

* User authentication & profiles
* Matchmaking
* Coding battles
* Judge submissions
* Hidden/public test cases
* Rating history
* Future leaderboard features

---

# Entity Relationship Overview

```text
auth.users
    ↓
 profiles
    ↓
 ├── matchmaking_queue
 ├── battle_participants
 ├── submissions
 └── ratings_history

problems
    ↓
 ├── problem_test_cases
 ├── battles
 └── submissions

battles
    ↓
 ├── battle_participants
 ├── submissions
 └── ratings_history
```

---

# Table: profiles

Stores public gameplay information for users.

Authentication is handled separately by Supabase Auth.

## Columns

| Column         | Type        | Description              |
| -------------- | ----------- | ------------------------ |
| id             | uuid        | References auth.users.id |
| username       | text        | Public username          |
| rating         | integer     | Current Elo rating       |
| wins           | integer     | Total wins               |
| losses         | integer     | Total losses             |
| battles_played | integer     | Total battles            |
| avatar_url     | text        | Profile picture          |
| created_at     | timestamptz | Creation timestamp       |

## Relationships

```text
profiles.id
    ↓
matchmaking_queue.user_id

battle_participants.user_id

submissions.user_id

ratings_history.user_id
```

---

# Table: problems

Stores problem metadata.

Does NOT store test cases.

## Columns

| Column          | Type             | Description          |
| --------------- | ---------------- | -------------------- |
| id              | uuid             | Problem ID           |
| title           | text             | Problem title        |
| description     | text             | Problem statement    |
| difficulty      | difficulty_level | EASY / MEDIUM / HARD |
| time_limit_ms   | integer          | Execution limit      |
| memory_limit_kb | integer          | Memory limit         |
| slug            | text             | URL slug             |
| is_active       | boolean          | Visibility flag      |
| categories      | text[]           | Categories           |
| input_format    | text[]           | Input explanation    |
| output_format   | text[]           | Output explanation   |
| constraints     | text[]           | Constraints          |
| created_at      | timestamptz      | Creation timestamp   |

---

# Example Problem

```text
Title:
Pair Sum

Difficulty:
EASY

Slug:
pair-sum

Categories:
Array

Input Format:
Line 1 → n
Line 2 → array
Line 3 → target
```

---

# Table: problem_test_cases

Stores all public and hidden test cases.

Most important table in the judge system.

## Columns

| Column          | Type                | Description           |
| --------------- | ------------------- | --------------------- |
| id              | uuid                | Test case ID          |
| problem_id      | uuid                | Problem reference     |
| input           | text                | Raw stdin             |
| expected_output | text                | Expected answer       |
| display_input   | text                | Human-readable input  |
| display_output  | text                | Human-readable output |
| visibility      | testcase_visibility | PUBLIC / PRIVATE      |
| order_index     | integer             | Execution order       |
| created_at      | timestamptz         | Creation timestamp    |

---

# Public Test Example

## input

```text
4
2 7 11 15
9
```

## expected_output

```text
0 1
```

## display_input

```text
nums=[2,7,11,15], target=9
```

---

# Hidden Test Example

```text
visibility = PRIVATE
```

Never exposed to frontend.

---

# Table: matchmaking_queue

Stores active matchmaking requests.

## Columns

| Column     | Type             | Description         |
| ---------- | ---------------- | ------------------- |
| id         | uuid             | Queue entry         |
| user_id    | uuid             | Player              |
| difficulty | difficulty_level | Selected difficulty |
| status     | queue_status     | SEARCHING / MATCHED |
| joined_at  | timestamptz      | Queue join time     |

## Rules

A user may only exist once in queue.

```text
user_id UNIQUE
```

---

# Table: battles

Represents a single coding battle.

## Columns

| Column     | Type          | Description      |
| ---------- | ------------- | ---------------- |
| id         | uuid          | Battle ID        |
| problem_id | uuid          | Assigned problem |
| status     | battle_status | Battle state     |
| winner_id  | uuid          | Winning user     |
| created_at | timestamptz   | Creation         |
| started_at | timestamptz   | Start time       |
| ended_at   | timestamptz   | End time         |

---

# Battle States

```text
WAITING
COUNTDOWN
ACTIVE
ENDED
```

---

# Table: battle_participants

Links users to battles.

Supports future multiplayer expansion.

## Columns

| Column    | Type    | Description  |
| --------- | ------- | ------------ |
| id        | uuid    | Row ID       |
| battle_id | uuid    | Battle       |
| user_id   | uuid    | User         |
| is_ready  | boolean | Ready status |

---

# Example

```text
Battle #123

Player A
Player B
```

Produces:

```text
battle_id | user_id
-------------------
123       | A
123       | B
```

---

# Table: submissions

Stores every code submission.

Used for:

* verdicts
* battle resolution
* analytics
* future replay support

## Columns

| Column           | Type               | Description          |
| ---------------- | ------------------ | -------------------- |
| id               | uuid               | Submission ID        |
| battle_id        | uuid               | Battle               |
| user_id          | uuid               | User                 |
| problem_id       | uuid               | Problem              |
| source_code      | text               | Submitted code       |
| language         | text               | Programming language |
| verdict          | submission_verdict | Result               |
| runtime_ms       | integer            | Runtime              |
| memory_kb        | integer            | Memory               |
| passed_testcases | integer            | Passed count         |
| total_testcases  | integer            | Total count          |
| created_at       | timestamptz        | Timestamp            |

---

# Verdict Types

```text
ACCEPTED
WRONG_ANSWER
TIME_LIMIT_EXCEEDED
RUNTIME_ERROR
COMPILATION_ERROR
```

---

# Table: ratings_history

Stores every rating change.

Allows future rating charts and season history.

## Columns

| Column        | Type        | Description     |
| ------------- | ----------- | --------------- |
| id            | uuid        | Record ID       |
| user_id       | uuid        | User            |
| battle_id     | uuid        | Battle          |
| old_rating    | integer     | Previous rating |
| new_rating    | integer     | New rating      |
| rating_change | integer     | Delta           |
| created_at    | timestamptz | Timestamp       |

---

# Judge Execution Flow

```text
User Clicks Submit
        ↓
Fetch Problem
        ↓
Fetch Test Cases
        ↓
Separate Public + Private
        ↓
Judge0 Execution
        ↓
Compare Outputs
        ↓
Create Submission
        ↓
Update Battle
        ↓
Update Rating
```

---

# Security Rules

## Hidden Test Cases

Frontend must NEVER access:

```text
PRIVATE
```

test cases.

Only backend routes may fetch them.

---

## Judge0 Access

Frontend NEVER talks directly to Judge0.

```text
Frontend
    ↓
API Route
    ↓
Judge0
```

---

