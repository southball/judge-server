# Judge-Server

This is the main backend server of the online judge.

This app is not responsible for any of the judging. It will provide an interface for judges to query submissions that are not yet judged and to return the judging result.

## Features

- Authentication server (username and password authentication, where password is stored as salted hash), with JWT support
- Other normal features supported by judge server:
    - Problems: view, create, edit, delete
    - Submissions: view, submit
    - Contest: view, create, edit, delete
        - Registering for contest
        - Contest-specific problem options
        - Scoreboard
    - User: register, login

## Progress

- Users:
    - [X] Login
    - [X] Register
- Problems:
    - [X] View
    - [X] Create
    - [ ] Edit
    - [X] Delete
- Contests:
    - [ ] View
    - [ ] Create
    - [ ] Edit
    - [ ] Delete
    - [ ] Register
    - [ ] Submit
    - [ ] Scoreboard
- Submissions:
    - [ ] View
    - [X] Submit
