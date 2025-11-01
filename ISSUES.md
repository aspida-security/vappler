# Vappler Issue Log

---

## 📝 Issue Template (Copy the section below for new issues)

| ID          | Status | Severity                   | Date Found |
| :---------- | :----- | :------------------------- | :--------- |
| [TICKET-ID] | Open   | [Critical/High/Medium/Low] | YYYY-MM-DD |

### [TICKET-ID]: Description

A clear and concise summary of the problem. Explain what is happening that shouldn't be, and what the impact is.

### [TICKET-ID]: Steps to Reproduce

Provide a step-by-step list of actions to trigger the bug.

1. Navigate to the **[Page Name]** page.
2. Click on the **[Button or Element Name]** component.
3. Enter `[Specific Input]` into the form field.
4. Observe the error.

### [TICKET-ID]: Expected Result

What *should* have happened after the final step?

### [TICKET-ID]: Actual Result

What *actually* happened? If applicable, include error messages or logs below.

---

## filed Issues

### VUL-238: PDF Export Fails for Large Scan Reports with 500 Error

| ID      | Status | Severity | Date Found   |
| :------ | :----- | :------- | :----------- |
| VUL-238 | Open   | High     | 2025-10-01   |

#### VUL-238: Description

When a user with a scan report containing over 1000 vulnerabilities tries to export it as a PDF, the application hangs for approximately 30 seconds and then displays a generic "Server Error" message. This prevents users from sharing or archiving large, critical reports.

#### VUL-283: Steps to Reproduce

1. Navigate to the **Completed Scans** page.
2. Click on a scan result that has **more than 1000 vulnerabilities**.
3. Click the **"Export as PDF"** button in the top right corner.
4. Observe the error toast notification after about 30 seconds.

#### VUL-238: Expected Result

A PDF file of the full scan report should be generated and downloaded by the browser without any errors.

#### VUL-238: Actual Result

The application shows a red toast notification with the message "Error 500: Internal Server Error". The server log shows a timeout exception. 2025-10-01 16:30:15 ERROR [ReportGeneratorService] TimeoutException: PDF generation for reportId=98712 exceeded maximum execution time of 30 seconds.

---

## 📝 New-Scan Button inoperable

| ID        | Status | Severity | Date Found |
| :-------  | :----- | :------- | :--------- |
| ERR-0001  | Open   |   High   | 2025-10-01 |

### ERR-0001: Description

New-Scan Button located on the Dashboard toolbar (Top) does nothing when pressed.

### ERR-0001: Steps to Reproduce

1. Navigate to the **Dashboard** page.
2. Click on the **New-Scan_Button** button component.
3. Observe the error. (Nothing happens)

### ERR-0001: Expected Result

New-Scan wizard *should* open prompting for new-scan details

### ERR-0001: Actual Result

Nothing happens.

---

## 📝 Reports Button inoperable

| ID         | Status | Severity   | Date Found |
| :--------- | :----- | :--------- | :--------- |
|  ERR-0002  | Open   |    High    | 2025-10-01 |

### ERR-0002: Description

Reports Button located on the Dashboard toolbar (Top) does nothing when pressed.

### ERR-0002: Steps to Reproduce

1. Navigate to the **Dashboard** page.
2. Click on the **Reports** button component.
3. Observe the error. (Nothing happens)

### ERR-0002: Expected Result

Reports Generator wizard *should* open prompting user to select details of a scan that the reports generator should use to produce a new report.

### ERR-0002: Actual Result

Nothing happens.

---

## 📝 Settings Page Missing

| ID       | Status | Severity   | Date Found |
| :------- | :----- | :--------- | :--------- |
| ERR-0003 | Open   |   High     | 2025-10-01 |

### ERR-0003: Description

Settings page doesn't exist.

### ERR-0003: Steps to Reproduce

1. Navigate to the **Dashboard** page.
2. Click on the **"..."(more_icon)** button component.
3. Click on the **settings** button component.
4. Brings up page 404 - not found.

### ERR-0003: Expected Result

Settings page *should* load.

### ERR-0003: Actual Result

404 - Page Not Found

The page you're looking for doesn't exist. Let's get you back!

---

## 📝 Help Page Missing

| ID       | Status | Severity   | Date Found |
| :------- | :----- | :--------- | :--------- |
| ERR-0004 |  Open  |    High    | 2025-10-01 |

### ERR-0004: Description

Help page doesn't exist.

### ERR-0004: Steps to Reproduce

1. Navigate to the **Dashboard** page.
2. Click on the **"..."(more_icon)** button component.
3. Click on the **help** button component.
4. Brings up page 404 - not found.

### ERR-0004: Expected Result

Help page *should* load.

### ERR-0004: Actual Result

404 - Page Not Found

The page you're looking for doesn't exist. Let's get you back!

---

## 📝 Left-Side Navigation explorer not collapsable

| ID        | Status | Severity | Date Found |
| :-------- | :----- | :------- | :--------- |
| ERR-0005  | Open   |  Medium  | 2025-10-01 |

### ERR-0005: Description

Left side navigation explorer bar does not contain a collapse/expand button which causes the "Dashboard" tab button on the page-selector bar at the top to be hidden behind the left side navigation explorer on rotated screens where the width of the screen is less than the height of the screen (pixels)

### ERR-0005: Steps to Reproduce

1. Navigate to the **Dashboard** page on desktop version with a monitor that has been rotated 90 degrees.
2. Click on the **Dashboard** button component.
3. Is very difficult to press button.

### ERR-0005: Expected Result

Left navigation explorer *should* be collapsed when width(pixels) < height(pixels)

### ERR-0005: Actual Result

Only the "ard" of "Dashboard" is visible due to non-resolution-adapting css, as the Left side navigation explorer covers up the "Dashbo" section of the dashboard-tab button.

---

## 📝 Drop-Down-List Collapse Function

| ID        | Status | Severity | Date Found |
| :-------- | :----- | :------- | :--------- |
| ERR-0006  | Open   |  Medium  | 2025-10-01 |

### ERR-0006: Description

Left side navigation explorer bar does not contain a collapse/expand button which causes the "Dashboard" tab button on the page-selector bar at the top to be hidden behind the left side navigation explorer on rotated screens where the width of the screen is less than the height of the screen (pixels)

### ERR-0006: Steps to Reproduce

1. Navigate to any **List Element** on any page.
2. Click on the **List-selector** button component.
3. Click anywhere outside of the list selector.
4. Observe that the list stays expanded.

### ERR-0006: Expected Result

List *should* should automatically collapse when out of focus (i.e. when a selection in made outside of the list while the list is open).

### ERR-0006: Actual Result

When clicking outside of expanded drop-down-list, the drop-down-list should collapse into default state.

---
