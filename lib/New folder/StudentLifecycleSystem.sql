
-- Student Lifecycle System SQL Schema

CREATE TABLE Applicants (
    ApplicantID INTEGER PRIMARY KEY,
    Name TEXT,
    Email TEXT,
    Phone TEXT,
    ApplyDate DATE,
    Status TEXT
);

CREATE TABLE Programs (
    ProgramID INTEGER PRIMARY KEY,
    ProgramName TEXT,
    TotalCredits INTEGER
);

CREATE TABLE Students (
    StudentID INTEGER PRIMARY KEY,
    ApplicantID INTEGER,
    Name TEXT,
    ProgramID INTEGER,
    JoinDate DATE,
    FOREIGN KEY (ApplicantID) REFERENCES Applicants(ApplicantID),
    FOREIGN KEY (ProgramID) REFERENCES Programs(ProgramID)
);

CREATE TABLE Courses (
    CourseID INTEGER PRIMARY KEY,
    CourseName TEXT,
    Credits INTEGER,
    ProgramID INTEGER,
    FOREIGN KEY (ProgramID) REFERENCES Programs(ProgramID)
);

CREATE TABLE Enrollments (
    EnrollID INTEGER PRIMARY KEY,
    StudentID INTEGER,
    CourseID INTEGER,
    Semester TEXT,
    FOREIGN KEY (StudentID) REFERENCES Students(StudentID),
    FOREIGN KEY (CourseID) REFERENCES Courses(CourseID)
);

CREATE TABLE Exams (
    ExamID INTEGER PRIMARY KEY,
    CourseID INTEGER,
    ExamDate DATE,
    FOREIGN KEY (CourseID) REFERENCES Courses(CourseID)
);

CREATE TABLE Results (
    ResultID INTEGER PRIMARY KEY,
    StudentID INTEGER,
    ExamID INTEGER,
    Score REAL,
    Grade TEXT,
    FOREIGN KEY (StudentID) REFERENCES Students(StudentID),
    FOREIGN KEY (ExamID) REFERENCES Exams(ExamID)
);

CREATE TABLE Internships (
    InternID INTEGER PRIMARY KEY,
    StudentID INTEGER,
    HoursCompleted INTEGER,
    FOREIGN KEY (StudentID) REFERENCES Students(StudentID)
);

CREATE TABLE Graduation (
    GradID INTEGER PRIMARY KEY,
    StudentID INTEGER,
    CompletedCredits INTEGER,
    GPA REAL,
    Eligible BOOLEAN,
    FOREIGN KEY (StudentID) REFERENCES Students(StudentID)
);

-- Sample Queries

-- GPA Calculation
SELECT StudentID, AVG(Score) AS GPA
FROM Results
GROUP BY StudentID;

-- Completed Credits
SELECT e.StudentID, SUM(c.Credits) AS TotalCredits
FROM Enrollments e
JOIN Courses c ON e.CourseID = c.CourseID
GROUP BY e.StudentID;

-- Eligible for Graduation
SELECT StudentID
FROM Graduation
WHERE GPA >= 2 AND CompletedCredits >= 120;
