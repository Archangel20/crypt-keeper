# Requirements Document

## Introduction

Crypt Keeper is a Halloween themed study app for students. It is a single page web app built with React and Vite. It runs in the browser, stores all data in localStorage, and has no login. The app has three connected parts: the Candle (focus timer), the Grimoire (flashcards) and the Seance (AI quiz). A home screen called the Crypt shows soul points, study streak and today's progress. The visual style uses dark purple and green colors, fog and candle effects, a spooky heading font and a readable body font. The layout works on phones and laptops.

## Glossary

- **Crypt_Keeper_App**: The complete React web application.
- **Crypt**: The home screen that shows soul points, study streak and today's progress.
- **Candle**: The focus timer feature, including the on-screen melting candle.
- **Study_Session**: One countdown period of the Candle in study mode.
- **Break_Session**: One countdown period of the Candle in break mode.
- **Soul_Point**: A reward unit earned when a Study_Session finishes.
- **Study_Streak**: The count of consecutive calendar days on which the student earned at least one Soul_Point.
- **Today_Progress**: The number of Study_Sessions finished and the total study minutes completed on the current calendar day.
- **Grimoire**: The flashcard feature, including decks, cards and study mode.
- **Deck**: A named collection of Cards.
- **Card**: A flashcard with a front text and a back text.
- **Review_Scheduler**: The component that decides the order in which Cards appear during Grimoire study mode.
- **Seance**: The AI quiz feature.
- **Ghost**: The character that asks the Seance questions.
- **Quiz_Generator**: The component that turns notes into quiz questions.
- **AI_Service**: The external AI API called by the Quiz_Generator.
- **Fallback_Generator**: The component that builds fill in the blank questions from notes without the AI_Service.
- **Question**: A multiple choice item with one question text, four answer options and one correct option.
- **Storage_Service**: The component that reads and writes app data in localStorage.
- **Notes**: The text the student pastes into the Seance.
- **Env_File**: The `.env` file that holds the AI API key.

## Requirements

### Requirement 1: Navigation and App Shell

**User Story:** As a student, I want to move between the Crypt, Candle, Grimoire and Seance, so that I can use every part of the app.

#### Acceptance Criteria

1. THE Crypt_Keeper_App SHALL display exactly four navigation links, labeled Crypt, Candle, Grimoire and Seance, on every screen.
2. WHEN the Crypt_Keeper_App loads, THE Crypt_Keeper_App SHALL display the Crypt screen as the active screen within 2 seconds.
3. WHEN the student selects a navigation link, THE Crypt_Keeper_App SHALL display the matching screen within 500 milliseconds without a full page reload.
4. WHILE a screen is displayed, THE Crypt_Keeper_App SHALL visually mark the navigation link for that screen as the active link and SHALL mark no other link as active.
5. IF the Crypt_Keeper_App fails to display the selected screen, THEN THE Crypt_Keeper_App SHALL keep the previously displayed screen visible and SHALL show an error message indicating the screen could not be loaded.
6. THE Crypt_Keeper_App SHALL allow use of every feature without any login, account creation or credential entry.

### Requirement 2: Candle Timer Controls

**User Story:** As a student, I want a focus timer with study and break periods, so that I can study in focused blocks.

#### Acceptance Criteria

1. THE Candle SHALL default to a Study_Session length of 25 minutes and a Break_Session length of 5 minutes when no saved lengths exist in the Storage_Service.
2. THE Candle SHALL allow the student to set the Study_Session length to any whole number from 1 to 120 minutes inclusive.
3. THE Candle SHALL allow the student to set the Break_Session length to any whole number from 1 to 60 minutes inclusive.
4. IF the student enters a length that is outside the allowed range, is not a whole number, is empty, or is non-numeric, THEN THE Candle SHALL reject the entry, keep the previous length unchanged, and display a validation message indicating the allowed range.
5. WHEN the student selects start while the countdown is not running, THE Candle SHALL count down the remaining time in one-second steps and display it in MM:SS format, updating the display at least once every 1 second.
6. WHEN the student selects pause while the countdown is running, THE Candle SHALL stop the countdown and keep the remaining time unchanged, and WHEN the student then selects start, THE Candle SHALL resume from that remaining time.
7. WHEN the student selects reset, THE Candle SHALL stop the countdown and restore the remaining time to the full configured length of the current session type.
8. WHEN the student changes a session length to a valid value, THE Candle SHALL save the new length through the Storage_Service.
9. WHEN the Candle loads, THE Candle SHALL restore the saved session lengths from the Storage_Service.
10. IF the Storage_Service fails to save or has no valid saved lengths on load, THEN THE Candle SHALL use the default lengths (or keep the current lengths on save failure), continue operating, and display a message indicating that settings could not be saved or loaded.
11. WHEN a session countdown reaches zero, THE Candle SHALL switch to the other session type, set the remaining time to the full length of that session type, and stop the countdown until the student selects start.
12. WHILE the countdown runs, THE Candle SHALL compute remaining time from the session end timestamp so that the displayed time is accurate to within 1 second after the browser tab has been in the background for any duration.
13. WHEN the student changes the length of the current session type while the countdown is not running, THE Candle SHALL set the remaining time to the new full length.

### Requirement 3: Melting Candle Visual

**User Story:** As a student, I want a candle that melts as time passes, so that I can see my progress at a glance.

#### Acceptance Criteria

1. WHILE a Study_Session is active, THE Candle SHALL render a candle whose height equals the remaining time divided by the session length, multiplied by the full candle height, with a minimum of 0% and a maximum of 100% of the full candle height.
2. WHEN the remaining time changes, THE Candle SHALL update the rendered candle height within 1 second of the change.
3. WHEN the student resets the session, THE Candle SHALL render the candle at 100% of the full candle height within 500 milliseconds of the reset.
4. WHEN the remaining time reaches 0 seconds, THE Candle SHALL render the candle at 0% of the full candle height and hide the flame animation.
5. WHILE the countdown runs, THE Candle SHALL animate a flame on the candle.
6. WHILE the countdown is paused, THE Candle SHALL hide the flame animation and keep the candle height unchanged.
7. WHERE the operating system setting prefers reduced motion is enabled, THE Crypt_Keeper_App SHALL disable the flame, fog and page turn animations and display static visuals in their place.
8. IF the session length is 0 seconds or cannot be read, THEN THE Candle SHALL render the candle at 100% of the full candle height without animation and avoid a division by zero.

### Requirement 4: Soul Points and Study Streak

**User Story:** As a student, I want to earn soul points and keep a streak, so that I stay motivated to study every day.

#### Acceptance Criteria

1. WHEN a Study_Session countdown reaches zero, THE Candle SHALL add exactly one Soul_Point to the total through the Storage_Service and persist the updated total before displaying the completion message.
2. WHEN a Break_Session countdown reaches zero, THE Candle SHALL leave the Soul_Point total unchanged.
3. WHEN the student resets a Study_Session before the countdown reaches zero, THE Candle SHALL leave the Soul_Point total, Today_Progress, and Study_Streak unchanged.
4. WHEN a Study_Session countdown reaches zero, THE Candle SHALL record the session in Today_Progress with its configured length as a whole number of minutes, and SHALL add that length to the Today_Progress total for the current calendar day.
5. WHEN a Study_Session countdown reaches zero on the calendar day immediately after the last study day, THE Crypt_Keeper_App SHALL increase the Study_Streak by exactly one.
6. WHEN a Study_Session countdown reaches zero on the same calendar day as the last study day, THE Crypt_Keeper_App SHALL leave the Study_Streak unchanged.
7. WHEN the Crypt displays the Study_Streak and the number of calendar days between today and the last study day is greater than one, THE Crypt_Keeper_App SHALL set the stored Study_Streak to zero and display zero.
8. WHEN a Study_Session countdown reaches zero and the Study_Streak is zero, THE Crypt_Keeper_App SHALL set the Study_Streak to one and record today as the last study day.
9. WHEN a Study_Session countdown reaches zero, THE Candle SHALL display a message stating that one Soul_Point was earned and the new Soul_Point total, and SHALL keep the message visible until the student dismisses it or starts another session.
10. IF the Storage_Service fails to save the Soul_Point total, Today_Progress, or Study_Streak after a Study_Session countdown reaches zero, THEN THE Candle SHALL display an error message indicating the progress was not saved and SHALL keep the updated values in memory for the current session.

### Requirement 5: The Crypt Home Screen

**User Story:** As a student, I want a home screen with my stats, so that I can see how I am doing.

#### Acceptance Criteria

1. WHEN the Crypt home screen is opened, THE Crypt SHALL display the total Soul_Points as a whole number read from the Storage_Service.
2. WHEN the Crypt home screen is opened, THE Crypt SHALL display the current Study_Streak as a whole number of consecutive days, labelled in days.
3. WHEN the Crypt home screen is opened, THE Crypt SHALL display Today_Progress as the count of finished Study_Sessions and the total study minutes, both counted within the current calendar day in the device local time zone.
4. WHILE the Crypt home screen is displayed, WHEN the device local calendar day changes at 00:00:00, THE Crypt SHALL update Today_Progress to zero sessions and zero minutes within 1 second.
5. WHEN the Crypt home screen is opened, THE Crypt SHALL provide exactly three links: one that starts the Candle, one that opens the Grimoire and one that opens the Seance, each labelled with its destination name.
6. WHEN the student activates a link on the Crypt home screen, THE Crypt SHALL navigate to the matching destination within 1 second.
7. WHEN the Crypt home screen is opened and no data exists in the Storage_Service, THE Crypt SHALL display zero for Soul_Points, zero for Study_Streak, and zero sessions and zero minutes for Today_Progress.
8. IF the Storage_Service cannot be read when the Crypt home screen is opened, THEN THE Crypt SHALL display zero for Soul_Points, Study_Streak and Today_Progress, display an error message indicating that stats could not be loaded, and keep the links to the Candle, Grimoire and Seance available.

### Requirement 6: Grimoire Deck and Card Management

**User Story:** As a student, I want to create decks and cards, so that I can build my own study material.

#### Acceptance Criteria

1. WHEN the student submits a deck name of 1 to 100 characters after trimming leading and trailing whitespace, THE Grimoire SHALL create a Deck with that trimmed name, with zero Cards, and display the Deck in the deck list.
2. WHEN the student submits a new deck name of 1 to 100 characters after trimming leading and trailing whitespace for an existing Deck, THE Grimoire SHALL update the Deck name to the trimmed value and preserve all Cards in the Deck.
3. WHEN the student confirms deleting a Deck, THE Grimoire SHALL delete the Deck and all of its Cards and remove the Deck from the deck list.
4. WHEN the student submits a front text and a back text, each of 1 to 500 characters after trimming leading and trailing whitespace, for a Deck, THE Grimoire SHALL add a Card with those trimmed texts to the Deck.
5. WHEN the student submits an edited front text and back text, each of 1 to 500 characters after trimming leading and trailing whitespace, for a Card, THE Grimoire SHALL update the front text and the back text of the Card to the trimmed values.
6. WHEN the student deletes a Card, THE Grimoire SHALL remove the Card from the Deck and decrease the Deck's Card count by 1.
7. IF the student submits a deck name, front text or back text that is empty, whitespace-only, or longer than its maximum length (100 characters for deck name, 500 characters for front or back text), THEN THE Grimoire SHALL reject the input, display a validation message indicating which field is invalid and why, and leave existing Decks and Cards unchanged.
8. WHEN a Deck or Card is created, renamed, edited or deleted, THE Grimoire SHALL save all Decks and Cards through the Storage_Service.
9. WHEN the Grimoire loads, THE Grimoire SHALL restore the saved Decks and Cards from the Storage_Service.
10. IF the Storage_Service fails to save or fails to load, or the loaded data cannot be read, THEN THE Grimoire SHALL display an error message indicating the failure, keep the in-memory Decks and Cards unchanged on a save failure, and start with an empty deck list on a load failure.
11. THE Grimoire SHALL display the number of Cards in each Deck in the deck list, showing 0 for a Deck with no Cards.

### Requirement 7: Grimoire Study Mode

**User Story:** As a student, I want to flip through cards with a spooky page turn, so that studying feels engaging.

#### Acceptance Criteria

1. WHEN the student starts study mode for a Deck containing at least 1 Card, THE Grimoire SHALL build a study queue containing every Card in the Deck and show the front of the first Card in the queue, with only one Card visible at a time.
2. WHEN the student selects the current Card or the flip control while the front of the Card is shown, THE Grimoire SHALL reveal the back of the Card using a page turn animation that completes within 600 milliseconds.
3. WHEN the back of a Card is shown, THE Grimoire SHALL provide a "Got it" control and a "Missed it" control.
4. WHEN the student selects "Got it" or "Missed it", THE Grimoire SHALL record the result for that Card and show the front of the next Card in the queue within 300 milliseconds.
5. IF the student starts study mode for a Deck with 0 Cards, THEN THE Grimoire SHALL not enter the study queue, SHALL display a message indicating that the Deck is empty, and SHALL offer a control to add a Card.
6. WHEN the study queue becomes empty, THE Grimoire SHALL display a session summary showing the total count of "Got it" results and the total count of "Missed it" results recorded during the session.
7. WHEN the student presses the space key while the front of a Card is shown and study mode has focus, THE Grimoire SHALL flip the Card using the same behavior as criterion 2.
8. WHILE the back of a Card is shown, THE Grimoire SHALL make the "Got it" and "Missed it" controls reachable in sequence with the Tab key, show a visible focus indicator on the focused control, and activate the focused control when the student presses the Enter key or the space key.

### Requirement 8: Review Scheduling for Missed Cards

**User Story:** As a student, I want cards I get wrong to come back sooner, so that I learn them faster.

#### Acceptance Criteria

1. WHEN the student selects "Missed it" for a Card, THE Review_Scheduler SHALL reinsert the Card into the study queue at a position between 1 and 3 positions after the current position, or at the end of the queue if fewer than 3 Cards remain in the queue.
2. WHEN the student selects "Got it" for a Card that has no "Missed it" result in the current session, THE Review_Scheduler SHALL remove the Card from the study queue.
3. WHEN the student selects "Got it" for a Card that has a "Missed it" result in the current session and has not yet been confirmed, THE Review_Scheduler SHALL mark the Card as confirmed and reinsert it at least 5 positions after the current position, or at the end of the queue if fewer than 5 Cards remain in the queue.
4. WHEN the student selects "Got it" for a Card that is marked as confirmed, THE Review_Scheduler SHALL remove the Card from the study queue.
5. WHEN the student selects "Missed it" for a Card that is marked as confirmed, THE Review_Scheduler SHALL clear the confirmed mark and reinsert the Card according to criterion 1.
6. THE Review_Scheduler SHALL keep every Card of the Deck in the study queue until the Card is removed under criterion 2 or criterion 4.
7. WHEN study mode starts, THE Review_Scheduler SHALL order the Cards of the Deck in random order.
8. WHEN a Card receives a "Missed it" result, THE Review_Scheduler SHALL increase the saved miss count of the Card by 1 and save it through the Storage_Service.
9. WHEN study mode starts, THE Review_Scheduler SHALL place Cards with a higher saved miss count earlier in the initial queue than Cards with a lower saved miss count, with random ordering among Cards of equal saved miss count.
10. IF the Storage_Service fails to save the miss count of a Card, THEN THE Review_Scheduler SHALL continue the study session with the queue unchanged by the failure, and SHALL display an error indication that the miss count was not saved.
11. WHEN the study queue becomes empty, THE Review_Scheduler SHALL end the study session.

### Requirement 9: Seance Notes Input and Quiz Generation

**User Story:** As a student, I want to paste my notes and get a quiz, so that I can test myself quickly.

#### Acceptance Criteria

1. THE Seance SHALL provide a text area where the student pastes Notes.
2. WHEN the student submits Notes of 200 to 12000 characters inclusive, THE Quiz_Generator SHALL produce exactly 5 Questions and THE Seance SHALL display the 5 Questions within 30 seconds of submission.
3. IF the student submits Notes of fewer than 200 characters, THEN THE Seance SHALL NOT invoke the Quiz_Generator, SHALL display a message stating the 200 character minimum and the current character count, and SHALL keep the Notes text unchanged in the text area.
4. IF the student submits Notes longer than 12000 characters, THEN THE Seance SHALL NOT invoke the Quiz_Generator, SHALL display a message stating the 12000 character maximum and the current character count, and SHALL keep the Notes text unchanged in the text area.
5. WHILE the Quiz_Generator is producing Questions, THE Seance SHALL display a loading indicator and disable the submit control until the Questions are displayed or an error message is displayed.
6. THE Quiz_Generator SHALL produce each Question with one question text of 1 to 300 characters, exactly 4 answer options of 1 to 150 characters each, and exactly 1 correct option.
7. THE Quiz_Generator SHALL produce Questions whose 4 options are distinct from each other, where distinct means no two options are identical after trimming leading and trailing whitespace and ignoring letter case.
8. IF the Quiz_Generator fails to produce 5 valid Questions or does not respond within 30 seconds, THEN THE Seance SHALL display an error message indicating that quiz generation failed, SHALL enable the submit control, SHALL keep the Notes text unchanged, and SHALL NOT display any partial Questions.

### Requirement 10: AI Provider and Fallback

**User Story:** As a student, I want the quiz to work even without an AI key, so that the app always works.

#### Acceptance Criteria

1. WHERE an AI API key is present in the Env_File, THE Quiz_Generator SHALL request exactly 5 Questions from the AI_Service using the Notes.
2. THE Crypt_Keeper_App SHALL read the AI API key only from the Env_File through Vite environment variables.
3. THE repository SHALL include an `.env.example` file that names every required variable and contains no real key values.
4. THE repository SHALL list the `.env` file in `.gitignore`.
5. WHERE no AI API key is present in the Env_File or the key value is empty or only whitespace, THE Quiz_Generator SHALL use the Fallback_Generator without sending any request to the AI_Service.
6. IF the AI_Service request fails, does not respond within 20 seconds, or returns a response that does not parse into exactly 5 valid Questions, THEN THE Quiz_Generator SHALL discard the AI_Service response, use the Fallback_Generator, and THE Seance SHALL display a message stating that simple questions were used.
7. WHEN the Fallback_Generator receives Notes, THE Fallback_Generator SHALL build exactly 5 fill in the blank Questions, each created by replacing one key term of a sentence from the Notes with a blank and offering 4 options made of the removed key term and 3 other distinct key terms from the Notes as distractors.
8. IF the Notes contain fewer than 5 usable sentences or fewer than 4 distinct key terms, THEN THE Seance SHALL display a message that asks the student to add more detail to the Notes and THE Quiz_Generator SHALL NOT start a quiz.
9. WHEN a quiz is displayed, THE Seance SHALL display a label stating either "AI questions" or "Simple questions" as the source of the current quiz.
10. THE Quiz_Generator SHALL parse the AI_Service response into Questions, and THE Quiz_Generator SHALL provide a printer that formats Questions back into the response format.
11. FOR ALL valid lists of Questions, parsing the output of the printer SHALL produce a list equivalent to the original list, with equal question text, equal options in the same order, and equal correct answer (round-trip property).

### Requirement 11: Seance Quiz Play

**User Story:** As a student, I want a ghost to ask me questions, so that the quiz is fun.

#### Acceptance Criteria

1. WHEN a quiz starts, THE Seance SHALL display the Ghost asking the first Question of 5, together with its 4 options, and no other Question.
2. WHEN the student selects an option for a Question that has not yet been answered, THE Seance SHALL mark the selected option as correct or incorrect, reveal the correct option, and disable selection of the other options for that Question within 200 ms.
3. WHEN the student has answered a Question that is not the 5th, THE Seance SHALL enable a control to move to the next Question, and WHEN the student activates that control, THE Seance SHALL display the next Question with its 4 options and unmarked options.
4. WHEN the student has answered all 5 Questions, THE Seance SHALL display a score in the form "N out of 5", where N is the count of correctly answered Questions (0 to 5).
5. WHEN the student selects an option, THE Seance SHALL display the Ghost with a correct-answer message if the option is correct, and with a different incorrect-answer message if the option is incorrect.
6. WHEN the quiz ends, THE Seance SHALL display controls to retry the quiz and to paste new Notes.
7. WHEN the student activates the retry control, THE Seance SHALL restart the quiz at the first Question with the same 5 Questions, a score of 0, and all options unanswered.
8. THE Seance SHALL allow the student to select an option by keyboard (focus an option and activate it with Enter or Space) and by touch (single tap on an option).

### Requirement 12: Save Wrong Answers as Flashcards

**User Story:** As a student, I want to turn my wrong answers into flashcards in one click, so that I can review them later.

#### Acceptance Criteria

1. WHEN the student submits an incorrect answer for a Question, THE Seance SHALL display a "Save to Grimoire" control for that Question within 500 milliseconds and keep it visible until the quiz ends.
2. WHEN the student selects "Save to Grimoire" for a Question that is not yet saved, THE Seance SHALL add one Card to the Deck named "Seance Mistakes", with the question text as the front and the text of the correct option as the back.
3. IF the Deck "Seance Mistakes" does not exist when a Card is to be added, THEN THE Seance SHALL create the Deck with the name "Seance Mistakes" before adding the Card.
4. WHEN a Card is added to the Deck "Seance Mistakes", THE Seance SHALL save the Deck through the Storage_Service and display a confirmation message within 1 second of the save completing.
5. IF the Storage_Service fails to save the Deck, THEN THE Seance SHALL display an error message indicating the save failed, leave the Deck in its previously saved state without the new Card, and keep the "Save to Grimoire" control available for retry.
6. IF a Card with the same question text as the front already exists in the Deck "Seance Mistakes", THEN THE Seance SHALL leave the Deck unchanged, add no Card, and display a message indicating the Card already exists.
7. WHEN the quiz ends and at least one Question was answered incorrectly, THE Seance SHALL display a control that saves all incorrectly answered Questions to the Deck "Seance Mistakes" in a single action, adding one Card per Question that is not already in the Deck, skipping duplicates, saving the Deck through the Storage_Service once, and displaying a confirmation message stating the number of Cards added and the number skipped.
8. WHEN the quiz ends and no Question was answered incorrectly, THE Seance SHALL not display the control that saves all incorrectly answered Questions.

### Requirement 13: Local Data Storage

**User Story:** As a student, I want my data kept in my browser, so that I do not need an account.

#### Acceptance Criteria

1. WHEN the Crypt_Keeper_App saves Soul_Points, Study_Streak, Today_Progress, timer settings, Decks or Cards, THE Storage_Service SHALL write them to localStorage under keys that start with "cryptkeeper:".
2. WHEN the Storage_Service writes data, THE Storage_Service SHALL encode it as JSON that includes an integer schema version number greater than or equal to 1.
3. FOR ALL valid app data objects, serializing then deserializing through the Storage_Service SHALL produce an object deeply equal to the original (round-trip property).
4. IF stored data is missing, is not valid JSON, does not match the expected shape, or has a schema version the Storage_Service does not support, THEN THE Storage_Service SHALL return default values for the affected data, SHALL leave the stored value unmodified until the next successful save, and SHALL let the Crypt_Keeper_App continue operating without throwing an unhandled error.
5. IF localStorage is unavailable or a write fails (including quota exceeded), THEN THE Crypt_Keeper_App SHALL keep all current-session data in memory, SHALL continue to accept student actions, and SHALL display a message within 1 second stating that progress may not be saved.
6. THE Crypt_Keeper_App SHALL send no student data to any server except Notes sent to the AI_Service when an AI API key is present.
7. WHERE an AI API key is present, THE Seance SHALL display a notice that Notes are sent to the AI_Service, visible whenever the Notes input is shown and before the student can submit Notes.

### Requirement 14: Visual Theme and Typography

**User Story:** As a student, I want a spooky look that is still easy to read, so that I enjoy the app and can study from it.

#### Acceptance Criteria

1. THE Crypt_Keeper_App SHALL render every screen with a dark purple background palette, where the background color has a hue between 260 and 290 degrees and a lightness at or below 20%, and green accent colors with a hue between 90 and 150 degrees applied to interactive controls and highlights.
2. THE Crypt_Keeper_App SHALL render all heading elements (levels 1 to 3) in a spooky display font, with a generic fallback font family defined for each heading.
3. THE Crypt_Keeper_App SHALL render card text, quiz text, notes text and timer labels in a sans-serif or serif font at a computed size of at least 16 px.
4. THE Crypt_Keeper_App SHALL render a fog effect in the background layer of every screen, behind all text and controls, without blocking pointer or keyboard input to the controls above it.
5. WHILE the operating system or browser reports a reduced-motion preference, THE Crypt_Keeper_App SHALL display the fog effect as static, with no animation.
6. THE Crypt_Keeper_App SHALL provide a text to background contrast ratio of at least 4.5:1 for body text, measured against the darkest and the lightest background area behind the text, including areas under the fog effect.
7. IF a custom font fails to load within 3 seconds, THEN THE Crypt_Keeper_App SHALL render the affected text using the fallback font stack, keeping all text visible and readable, with no loss of content or functionality.
8. WHEN a control receives keyboard focus, THE Crypt_Keeper_App SHALL show a visible focus indicator at least 2 px thick with a contrast ratio of at least 3:1 against the adjacent background.

### Requirement 15: Responsive and Accessible Layout

**User Story:** As a student, I want the app to work on my phone and laptop, so that I can study anywhere.

#### Acceptance Criteria

1. WHILE the viewport width is between 320 px and 1920 px inclusive, THE Crypt_Keeper_App SHALL display all content with the document's scrollable width equal to the viewport width (no horizontal scrollbar and no content clipped on the horizontal axis).
2. WHILE the viewport width is below 768 px, THE Crypt_Keeper_App SHALL display the navigation as a bar fixed to the bottom edge of the viewport, and SHALL NOT display the navigation at the top or side of the viewport.
3. WHILE the viewport width is 768 px or above, THE Crypt_Keeper_App SHALL NOT display the navigation as a bottom bar.
4. THE Crypt_Keeper_App SHALL size every touch control (buttons, links, toggles, and inputs) with a tappable area of at least 44 px by 44 px.
5. THE Crypt_Keeper_App SHALL provide a non-empty accessible name for the candle, the Ghost, and every icon-only control.
6. WHEN the Candle timer reaches zero, THE Candle SHALL announce the session end through an ARIA live region within 1 second, using a message that states the session has ended.
7. THE Crypt_Keeper_App SHALL allow every interactive control to be reached with the Tab key and activated with the Enter key or Space key, with no keyboard trap.
8. WHILE a control has keyboard focus, THE Crypt_Keeper_App SHALL display a visible focus indicator on that control.

### Requirement 16: Project Setup

**User Story:** As a developer, I want a clean Vite and React project, so that I can build and run the app easily.

#### Acceptance Criteria

1. THE Crypt_Keeper_App SHALL be built with React and Vite and SHALL run in a browser with no backend server of its own.
2. THE repository SHALL provide npm scripts named `dev`, `build`, `preview` and `test` in its package manifest, which respectively start the dev server, produce a production build, serve the production build locally, and run the test suite once and exit.
3. THE repository SHALL include a README in its root directory that documents the prerequisite Node.js version, the install command, the command to run each npm script, every Env_File variable (name, purpose, whether required or optional), and the fallback behavior used when each Env_File variable is missing or empty.
4. WHEN `npm run build` runs on a clean install with the Env_File absent, THE Crypt_Keeper_App SHALL complete the build with exit code 0 and zero build errors, and SHALL write the production output to the build output directory.
5. WHEN `npm test` runs on a clean install, THE repository SHALL execute the test suite once without watch mode and exit with code 0 if all tests pass and a non-zero code if any test fails.
