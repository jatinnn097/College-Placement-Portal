const express = require("express");
const cors = require("cors");
const multer = require("multer");
const session = require("express-session");
const { MongoClient, ObjectId } = require("mongodb");
const { PDFParse } = require("pdf-parse");
const QRCode = require("qrcode");

const app = express();





const url =
    "mongodb://karthikng:karthikng@ac-zbt2esd-shard-00-00.qsvcm0e.mongodb.net:27017,ac-zbt2esd-shard-00-01.qsvcm0e.mongodb.net:27017,ac-zbt2esd-shard-00-02.qsvcm0e.mongodb.net:27017/?ssl=true&replicaSet=atlas-f2a2zr-shard-0&authSource=admin&appName=Cluster0";


const client = new MongoClient(url);


// =====================================================
// BASIC EXPRESS SETUP
// =====================================================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(cors());

app.use(
    express.static("public")
);

app.set(
    "view engine",
    "ejs"
);


// =====================================================
// SESSION
// =====================================================

app.use(
    session({
        secret: "placementportal",
        resave: false,
        saveUninitialized: false
    })
);


// =====================================================
// MULTER
// =====================================================

const upload = multer({
    storage: multer.memoryStorage()
});


// =====================================================
// ATS FUNCTION
// =====================================================

function calculateATS(resumeText, jobDescription) {

    const resume =
        (resumeText || "").toLowerCase();

    const job =
        (jobDescription || "").toLowerCase();


    // Skills checked by ATS

    const skills = [

        "c++",
        "java",
        "python",
        "javascript",
        "react",
        "node.js",
        "node",
        "mongodb",
        "mysql",
        "sql",
        "html",
        "css",
        "git",
        "github",
        "express",
        "flask",
        "machine learning",
        "data analytics",
        "data science",
        "docker",
        "aws",
        "azure",
        "pandas",
        "numpy",
        "ejs"

    ];


    // =================================================
    // RESUME SKILLS
    // =================================================

    const resumeSkills = [];


    for (const skill of skills) {

        if (resume.includes(skill)) {

            resumeSkills.push(skill);

        }

    }


    // =================================================
    // REQUIRED JOB SKILLS
    // =================================================

    const requiredSkills = [];


    for (const skill of skills) {

        if (job.includes(skill)) {

            requiredSkills.push(skill);

        }

    }


    // =================================================
    // MATCHING
    // =================================================

    const matchedSkills = [];

    const missingSkills = [];


    for (const skill of requiredSkills) {

        if (resumeSkills.includes(skill)) {

            matchedSkills.push(skill);

        } else {

            missingSkills.push(skill);

        }

    }


    // =================================================
    // SCORE
    // =================================================

    let score = 0;


    if (requiredSkills.length > 0) {

        score = Math.round(

            (
                matchedSkills.length /
                requiredSkills.length
            ) * 100

        );

    }


    // =================================================
    // RESULT
    // =================================================

    let result;


    if (score >= 80) {

        result = "Excellent Match";

    }

    else if (score >= 60) {

        result = "Good Match";

    }

    else if (score >= 40) {

        result = "Average Match";

    }

    else {

        result = "Low Match";

    }


    // =================================================
    // CONSOLE
    // =================================================

    console.log(
        "================================"
    );

    console.log(
        "ATS SCAN"
    );

    console.log(
        "Resume Skills:",
        resumeSkills
    );

    console.log(
        "Required Skills:",
        requiredSkills
    );

    console.log(
        "Matched Skills:",
        matchedSkills
    );

    console.log(
        "Missing Skills:",
        missingSkills
    );

    console.log(
        "ATS Score:",
        score
    );

    console.log(
        "================================"
    );


    return {

        score,

        result,

        resumeSkills,

        requiredSkills,

        matchedSkills,

        missingSkills

    };

}


// =====================================================
// MAIN
// =====================================================

async function main() {

    await client.connect();

    console.log(
        "MongoDB Connected"
    );


    // =================================================
    // DATABASE
    // =================================================

    const db =
        client.db("college");


    // =================================================
    // COLLECTIONS
    // =================================================

    const users =
        db.collection("users");

    const students =
        db.collection("students");

    const companies =
        db.collection("companies");

    const drives =
        db.collection("drives");

    const applications =
        db.collection("applications");

    const announcements =
        db.collection("announcements");

    const interviewSlots =
        db.collection("interviewSlots");
 
    const notificationsCollection = db.collection("notifications");




async function createNotification(usn, title, message, type = "info", link = "#") {

    if (!usn) return;

    await notificationsCollection.insertOne({
        usn: usn,
        title: title,
        message: message,
        type: type,
        link: link,
        read: false,
        createdAt: new Date()
    });
}


// ============================================
// STUDENT NOTIFICATIONS API
// ============================================

// Get notifications
app.get("/student/notifications", async (req, res) => {

    try {

        if (!req.session.student) {
            return res.status(401).json({
                success: false,
                message: "Not logged in"
            });
        }

        const usn = req.session.student.usn;

        const notifications =
            await notificationsCollection
                .find({ usn: usn })
                .sort({ createdAt: -1 })
                .limit(30)
                .toArray();

        const unreadCount =
            await notificationsCollection.countDocuments({
                usn: usn,
                read: false
            });

        res.json({
            success: true,
            notifications: notifications,
            unreadCount: unreadCount
        });

    } catch (error) {

        console.error("Notification error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load notifications"
        });

    }

});


// ============================================
// MARK ONE NOTIFICATION AS READ
// ============================================

app.put("/student/notifications/:id/read", async (req, res) => {

    try {

        if (!req.session.student) {
            return res.status(401).json({
                success: false
            });
        }

        const { ObjectId } = require("mongodb");

        await notificationsCollection.updateOne(
            {
                _id: new ObjectId(req.params.id),
                usn: req.session.student.usn
            },
            {
                $set: {
                    read: true
                }
            }
        );

        res.json({
            success: true
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false
        });

    }

});


// ============================================
// MARK ALL NOTIFICATIONS AS READ
// ============================================

app.put("/student/notifications/read-all", async (req, res) => {

    try {

        if (!req.session.student) {
            return res.status(401).json({
                success: false
            });
        }

        await notificationsCollection.updateMany(
            {
                usn: req.session.student.usn,
                read: false
            },
            {
                $set: {
                    read: true
                }
            }
        );

        res.json({
            success: true
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false
        });

    }

});


    // =================================================
    // HOME / LOGIN
    // =================================================

    app.get("/", async (req, res) => {

        try {

            const companiesList =
                await companies.find().toArray();

            res.render(
                "login",
                {
                    error: "",
                    companiesList
                }
            );

        } catch (error) {

            console.error(error);

            res.status(500).send(
                "Error loading login page"
            );

        }

    });


    // =================================================
    // ADMIN REGISTER
    // =================================================

    app.get(
        "/register",
        (req, res) => {

            res.render(
                "signup",
                {
                    error: ""
                }
            );

        }
    );


    app.post(
        "/register",
        async (req, res) => {

            try {

                const {
                    name,
                    email,
                    password
                } = req.body;


                const existing =
                    await users.findOne({
                        email
                    });


                if (existing) {

                    return res.render(
                        "signup",
                        {
                            error:
                                "User already exists"
                        }
                    );

                }


                await users.insertOne({

                    name,

                    email,

                    password,

                    role: "admin"

                });


                res.redirect("/");

            } catch (error) {

                console.error(error);

                res.status(500).send(
                    "Registration error"
                );

            }

        }
    );


    // =================================================
    // LOGIN
    // =================================================

    app.post(
        "/login",
        async (req, res) => {

            try {

                const email =
                    req.body.email;

                const password =
                    req.body.password;


                // =====================================
                // ADMIN LOGIN
                // =====================================

                const admin =
                    await users.findOne({

                        email,

                        password

                    });


                if (admin) {

                    req.session.admin =
                        admin.email;

                    return res.redirect(
                        "/admin"
                    );

                }


                // =====================================
                // STUDENT LOGIN
                // =====================================

                const student =
                    await students.findOne({

                        email,

                        usn:
                            password.toUpperCase()

                    });


                if (student) {

                    req.session.student =
                        student.usn;

                    return res.redirect(
                        "/student/dashboard"
                    );

                }


                // =====================================
                // HR LOGIN
                // =====================================

                const hr =
                    await companies.findOne({

                        email

                    });


                if (
                    hr &&
                    password === "company123"
                ) {

                    req.session.hr =
                        hr.company;

                    return res.redirect(
                        "/hr/dashboard"
                    );

                }


                // =====================================
                // INVALID LOGIN
                // =====================================

                const companiesList =
                    await companies
                        .find()
                        .toArray();


                return res.render(
                    "login",
                    {

                        error:
                            "Invalid email or password",

                        companiesList

                    }
                );


            } catch (error) {

                console.error(error);

                res.status(500).send(
                    "Login error"
                );

            }

        }
    );


    // =================================================
    // LOGOUT
    // =================================================

    app.get(
        "/logout",
        (req, res) => {

            req.session.destroy(
                () => {

                    res.redirect("/");

                }
            );

        }
    );


    // =================================================
    // ADMIN DASHBOARD
    // =================================================

    app.get(
        "/admin",
        async (req, res) => {

            if (!req.session.admin) {

                return res.redirect("/");

            }


            try {

                const totalStudents =
                    await students.countDocuments();


                const totalCompanies =
                    await companies.countDocuments();


                const totalDrives =
                    await drives.countDocuments();


                const totalApplications =
                    await applications
                        .countDocuments();


                const selectedStudents =
                    await applications
                        .countDocuments({
                            status: "Selected"
                        });


                const data =
                    await students
                        .find()
                        .toArray();


                res.render(
                    "admin",
                    {

                        data,

                        totalStudents,

                        totalCompanies,

                        totalDrives,

                        totalApplications,

                        selectedStudents

                    }
                );


            } catch (error) {

                console.error(error);

                res.status(500).send(
                    "Admin dashboard error"
                );

            }

        }
    );


    // =================================================
    // ADD STUDENT
    // =================================================

    app.get(
        "/add",
        (req, res) => {

            if (!req.session.admin) {

                return res.redirect("/");

            }

            res.render("add");

        }
    );


    app.post(
        "/add",
        upload.single("photo"),
        async (req, res) => {

            try {

                const {

                    usn,

                    fullname,

                    email,

                    branch,

                    sem,

                    cgpa

                } = req.body;


                const existing =
                    await students.findOne({

                        usn:
                            usn.toUpperCase()

                    });


                if (existing) {

                    return res.send(
                        "Student already exists"
                    );

                }


                await students.insertOne({

                    usn:
                        usn.toUpperCase(),

                    fullname,

                    email,

                    branch,

                    sem:
                        Number(sem),

                    cgpa:
                        Number(cgpa),

                    photo:
                        req.file
                            ? req.file.buffer
                            : null,

                    contentType:
                        req.file
                            ? req.file.mimetype
                            : null,

                    resume: null,

                    resumeName: null,

                    resumeContentType: null,

                    phone: "",

                    dob: "",

                    address: "",

                    sslc: 0,

                    puc: 0,

                    backlogs: 0,

                    passingYear: 0,

                    skills: [],

                    results: []

                });


                res.redirect("/admin");


            } catch (error) {

                console.error(error);

                res.status(500).send(
                    "Error adding student"
                );

            }

        }
    );


    // =================================================
    // STUDENT PHOTO
    // =================================================

    app.get(
        "/photo/:usn",
        async (req, res) => {

            try {

                const student =
                    await students.findOne({

                        usn:
                            req.params.usn
                                .toUpperCase()

                    });


                if (
                    !student ||
                    !student.photo
                ) {

                    return res.status(404)
                        .send(
                            "Photo not found"
                        );

                }


                let photoBuffer;


                if (
                    Buffer.isBuffer(
                        student.photo
                    )
                ) {

                    photoBuffer =
                        student.photo;

                }

                else if (
                    student.photo.buffer
                ) {

                    photoBuffer =
                        Buffer.from(
                            student.photo.buffer
                        );

                }

                else {

                    photoBuffer =
                        Buffer.from(
                            student.photo
                        );

                }


                res.set(
                    "Content-Type",
                    student.contentType ||
                    "image/jpeg"
                );


                res.send(
                    photoBuffer
                );


            } catch (error) {

                console.error(
                    "PHOTO ERROR:",
                    error
                );

                res.status(500).send(
                    "Error loading photo"
                );

            }

        }
    );


    // =================================================
    // DELETE STUDENT
    // =================================================

    app.get(
        "/delete/:usn",
        async (req, res) => {

            if (!req.session.admin) {

                return res.redirect("/");

            }


            await students.deleteOne({

                usn:
                    req.params.usn
                        .toUpperCase()

            });


            res.redirect("/admin");

        }
    );


    // =================================================
    // EDIT STUDENT
    // =================================================

    app.get(
        "/edit/:usn",
        async (req, res) => {

            if (!req.session.admin) {

                return res.redirect("/");

            }


            const student =
                await students.findOne({

                    usn:
                        req.params.usn
                            .toUpperCase()

                });


            res.render(
                "edit",
                {
                    student
                }
            );

        }
    );


    app.post(
        "/edit/:usn",
        upload.single("photo"),
        async (req, res) => {

            try {

                const data = {

                    fullname:
                        req.body.fullname,

                    email:
                        req.body.email,

                    branch:
                        req.body.branch,

                    sem:
                        Number(req.body.sem),

                    cgpa:
                        Number(req.body.cgpa)

                };


                if (req.file) {

                    data.photo =
                        req.file.buffer;

                    data.contentType =
                        req.file.mimetype;

                }


                await students.updateOne(

                    {

                        usn:
                            req.params.usn
                                .toUpperCase()

                    },

                    {

                        $set:
                            data

                    }

                );


                res.redirect("/admin");


            } catch (error) {

                console.error(error);

                res.status(500).send(
                    "Error editing student"
                );

            }

        }
    );


    // =================================================
    // SEARCH STUDENT
    // =================================================

    app.get(
        "/search",
        async (req, res) => {

            const keyword =
                req.query.keyword || "";


            const data =
                await students.find({

                    fullname: {

                        $regex:
                            keyword,

                        $options:
                            "i"

                    }

                }).toArray();


            res.render(
                "search",
                {
                    data
                }
            );

        }
    );


    // =================================================
    // STUDENT UPLOAD RESUME
    // =================================================

    app.post(
        "/student/upload-resume",
        upload.single("resume"),
        async (req, res) => {

            if (!req.session.student) {

                return res.redirect("/");

            }


            if (!req.file) {

                return res.send(
                    "Please select a resume"
                );

            }


            if (
                req.file.mimetype !==
                "application/pdf"
            ) {

                return res.send(
                    "Only PDF resumes are allowed"
                );

            }


            await students.updateOne(

                {

                    usn:
                        req.session.student

                },

                {

                    $set: {

                        resume:
                            req.file.buffer,

                        resumeName:
                            req.file.originalname,

                        resumeContentType:
                            req.file.mimetype

                    }

                }

            );


            res.redirect(
                "/student/dashboard"
            );

        }
    );


    // =================================================
    // VIEW STUDENT RESUME
    // =================================================

    app.get(
        "/student/resume",
        async (req, res) => {

            if (!req.session.student) {

                return res.redirect("/");

            }


            try {

                const student =
                    await students.findOne({

                        usn:
                            req.session.student

                    });


                if (
                    !student ||
                    !student.resume
                ) {

                    return res.status(404)
                        .send(
                            "Resume not found"
                        );

                }


                let resumeBuffer;


                if (
                    Buffer.isBuffer(
                        student.resume
                    )
                ) {

                    resumeBuffer =
                        student.resume;

                }

                else if (
                    student.resume.buffer
                ) {

                    resumeBuffer =
                        Buffer.from(
                            student.resume.buffer
                        );

                }

                else if (
                    student.resume.$binary &&
                    student.resume.$binary.base64
                ) {

                    resumeBuffer =
                        Buffer.from(

                            student.resume
                                .$binary
                                .base64,

                            "base64"

                        );

                }

                else {

                    return res.status(500)
                        .send(
                            "Invalid resume data"
                        );

                }


                if (
                    !resumeBuffer ||
                    resumeBuffer.length === 0
                ) {

                    return res.status(404)
                        .send(
                            "Resume file is empty"
                        );

                }


                res.setHeader(
                    "Content-Type",
                    "application/pdf"
                );


                res.setHeader(
                    "Content-Disposition",
                    `inline; filename="${student.resumeName || "resume.pdf"}"`
                );


                res.setHeader(
                    "Content-Length",
                    resumeBuffer.length
                );


                res.send(
                    resumeBuffer
                );


            } catch (error) {

                console.error(
                    "RESUME ERROR:",
                    error
                );

                res.status(500).send(
                    "Error loading resume"
                );

            }

        }
    );


    // =================================================
    // STUDENT DASHBOARD
    // =================================================

    app.get(
        "/student/dashboard",
        async (req, res) => {

            if (!req.session.student) {

                return res.redirect("/");

            }


            try {

                const student =
                    await students.findOne({

                        usn:
                            req.session.student

                    });


                if (!student) {

                    req.session.destroy();

                    return res.redirect("/");

                }


                const companiesList =
                    await drives
                        .find()
                        .toArray();


                const myApplications =
                    await applications
                        .find({

                            usn:
                                req.session.student

                        })
                        .toArray();


                const news =
                    await announcements
                        .find()
                        .sort({
                            date: -1
                        })
                        .toArray();


                res.render(
                    "studentDashboard",
                    {

                        student,

                        companiesList,

                        myApplications,

                        news

                    }
                );


            } catch (error) {

                console.error(error);

                res.status(500).send(
                    "Student dashboard error"
                );

            }

        }
    );


    // =================================================
    // STUDENT DETAILS
    // =================================================
// ============================================================
// STUDENT INTERVIEW CALENDAR
// ============================================================

app.get("/student/interview-calendar", async (req, res) => {

    try {

        if (!req.session.student) {
            return res.redirect("/");
        }

        const student = await students.findOne({
            usn: req.session.student
        });

        if (!student) {
            return res.status(404).send("Student Not Found");
        }

        const interviews = await applications.find({
            usn: student.usn,
            status: "Interview Scheduled"
        }).toArray();

        res.render("interview-calendar", {
            student: student,
            interviews: interviews
        });

    } catch (error) {

        console.error(
            "INTERVIEW CALENDAR ERROR:",
            error
        );

        res.status(500).send(
            "Unable to load interview calendar"
        );

    }

});


// ============================================================
// STUDENT PROFILE + QR
// ============================================================

app.get("/student/:usn", async (req, res) => {

    const usn = req.params.usn.toUpperCase();

    const student = await students.findOne({
        usn: usn
    });

    if (!student) {
        return res.status(404).send("Student Not Found");
    }

    const applicationsList =
        await applications.find({
            usn: usn
        }).toArray();

    const selectedApplications =
        applicationsList.filter(
            application =>
                application.status === "Selected"
        );

    const baseUrl =
        `${req.protocol}://${req.get("host")}`;

    const profileUrl =
        `${baseUrl}/student/${student.usn}`;

    const qrCode =
        await QRCode.toDataURL(profileUrl);

    res.render("student", {
        student,
        applicationsList,
        selectedApplications,
        qrCode
    });

});



    // =================================================
    // STUDENT PROFILE PAGE
    // =================================================

    app.get(
        "/student/profile",
        async (req, res) => {

            if (!req.session.student) {

                return res.redirect("/");

            }


            try {

                const student =
                    await students.findOne({

                        usn:
                            req.session.student

                    });


                if (!student) {

                    return res.status(404)
                        .send(
                            "Student not found"
                        );

                }


                res.render(
                    "studentProfile",
                    {
                        student
                    }
                );


            } catch (error) {

                console.error(
                    "PROFILE ERROR:",
                    error
                );

                res.status(500).send(
                    "Error loading student profile"
                );

            }

        }
    );


    // =================================================
    // UPDATE STUDENT PROFILE
    // =================================================

    app.post(
        "/student/profile",
        async (req, res) => {

            if (!req.session.student) {

                return res.redirect("/");

            }


            try {

                const {

                    fullname,

                    phone,

                    dob,

                    address,

                    branch,

                    sem,

                    sslc,

                    puc,

                    cgpa,

                    backlogs,

                    passingYear,

                    skills

                } = req.body;


                let skillArray = [];


                if (
                    skills &&
                    skills.trim() !== ""
                ) {

                    skillArray =
                        skills
                            .split(",")
                            .map(
                                skill =>
                                    skill.trim()
                            )
                            .filter(
                                skill =>
                                    skill.length > 0
                            );

                }


                const updateData = {

                    fullname:
                        fullname || "",

                    phone:
                        phone || "",

                    dob:
                        dob || "",

                    address:
                        address || "",

                    branch:
                        branch || "",

                    sem:
                        sem
                            ? Number(sem)
                            : 0,

                    sslc:
                        sslc
                            ? Number(sslc)
                            : 0,

                    puc:
                        puc
                            ? Number(puc)
                            : 0,

                    cgpa:
                        cgpa
                            ? Number(cgpa)
                            : 0,

                    backlogs:
                        backlogs
                            ? Number(backlogs)
                            : 0,

                    passingYear:
                        passingYear
                            ? Number(passingYear)
                            : 0,

                    skills:
                        skillArray,

                    updatedAt:
                        new Date()

                };


                await students.updateOne(

                    {

                        usn:
                            req.session.student

                    },

                    {

                        $set:
                            updateData

                    }

                );


                res.redirect(
                    "/student/profile"
                );


            } catch (error) {

                console.error(
                    "UPDATE PROFILE ERROR:",
                    error
                );

                res.status(500).send(
                    "Error updating profile"
                );

            }

        }
    );


    // =================================================
    // ADD RESULT
    // =================================================

    app.get(
        "/result/:usn",
        async (req, res) => {

            if (!req.session.admin) {

                return res.redirect("/");

            }


            const student =
                await students.findOne({

                    usn:
                        req.params.usn
                            .toUpperCase()

                });


            res.render(
                "result",
                {
                    student
                }
            );

        }
    );


    app.post(
        "/result/:usn",
        async (req, res) => {

            const result = {

                sem:
                    Number(
                        req.body.semester
                    ),

                subjects: [

                    {

                        subject:
                            req.body.sub1,

                        marks:
                            Number(
                                req.body.mark1
                            )

                    },

                    {

                        subject:
                            req.body.sub2,

                        marks:
                            Number(
                                req.body.mark2
                            )

                    },

                    {

                        subject:
                            req.body.sub3,

                        marks:
                            Number(
                                req.body.mark3
                            )

                    },

                    {

                        subject:
                            req.body.sub4,

                        marks:
                            Number(
                                req.body.mark4
                            )

                    },

                    {

                        subject:
                            req.body.sub5,

                        marks:
                            Number(
                                req.body.mark5
                            )

                    },

                    {

                        subject:
                            req.body.sub6,

                        marks:
                            Number(
                                req.body.mark6
                            )

                    }

                ],

                percentage:
                    Number(
                        req.body.percentage
                    ),

                cgpa:
                    Number(
                        req.body.cgpa
                    ),

                published: true

            };


            await students.updateOne(

                {

                    usn:
                        req.params.usn
                            .toUpperCase()

                },

                {

                    $push: {

                        results:
                            result

                    }

                }

            );


            res.redirect("/admin");

        }
    );


    // =================================================
    // SEMESTER RESULT
    // =================================================

    app.get(
        "/student/result/:sem",
        async (req, res) => {

            if (!req.session.student) {

                return res.redirect("/");

            }


            const student =
                await students.findOne({

                    usn:
                        req.session.student

                });


            if (!student) {

                return res.send(
                    "Student not found"
                );

            }


            const sem =
                Number(
                    req.params.sem
                );


            const result =
                (student.results || [])
                    .find(
                        item =>
                            item.sem === sem
                    );


            res.render(
                "semResult",
                {

                    student,

                    sem,

                    result

                }
            );

        }
    );


    // =================================================
    // COMPANY LIST
    // =================================================

    app.get(
        "/companies",
        async (req, res) => {

            const data =
                await companies
                    .find()
                    .toArray();


            res.render(
                "companies",
                {
                    data
                }
            );

        }
    );


    // =================================================
    // ADD COMPANY
    // =================================================

    app.get(
        "/company/add",
        (req, res) => {

            if (!req.session.admin) {

                return res.redirect("/");

            }

            res.render(
                "addCompany"
            );

        }
    );


    app.post(
        "/company/add",
        upload.single("logo"),
        async (req, res) => {

            await companies.insertOne({

                company:
                    req.body.company,

                email:
                    req.body.email,

                password:
                    "company123",

                role:
                    req.body.role,

                package:
                    req.body.package,

                mincgpa:
                    Number(
                        req.body.mincgpa
                    ),

                deadline:
                    req.body.deadline,

                description:
                    req.body.description,

                logo:
                    req.file
                        ? req.file.buffer
                        : null,

                logoContentType:
                    req.file
                        ? req.file.mimetype
                        : null

            });


            res.redirect(
                "/companies"
            );

        }
    );


    // =================================================
    // COMPANY LOGO
    // =================================================

    app.get(
        "/company/logo/:id",
        async (req, res) => {

            try {

                const company =
                    await companies.findOne({

                        _id:
                            new ObjectId(
                                req.params.id
                            )

                    });


                if (
                    !company ||
                    !company.logo
                ) {

                    return res.status(404)
                        .send(
                            "Logo not found"
                        );

                }


                let logoBuffer;


                if (
                    Buffer.isBuffer(
                        company.logo
                    )
                ) {

                    logoBuffer =
                        company.logo;

                }

                else if (
                    company.logo.buffer
                ) {

                    logoBuffer =
                        company.logo.buffer;

                }

                else {

                    logoBuffer =
                        Buffer.from(
                            company.logo
                        );

                }


                res.set(

                    "Content-Type",

                    company.logoContentType ||
                    "image/png"

                );


                res.send(
                    logoBuffer
                );


            } catch (error) {

                console.error(
                    "COMPANY LOGO ERROR:",
                    error
                );

                res.status(500).send(
                    "Error loading logo"
                );

            }

        }
    );


    // =================================================
    // EDIT COMPANY
    // =================================================

    app.post(
        "/company/edit/:id",
        async (req, res) => {

            await companies.updateOne(

                {

                    _id:
                        new ObjectId(
                            req.params.id
                        )

                },

                {

                    $set: {

                        company:
                            req.body.company,

                        email:
                            req.body.email,

                        role:
                            req.body.role,

                        package:
                            req.body.package,

                        mincgpa:
                            Number(
                                req.body.mincgpa
                            ),

                        deadline:
                            req.body.deadline,

                        description:
                            req.body.description

                    }

                }

            );


            res.redirect(
                "/companies"
            );

        }
    );


    // =================================================
    // DELETE COMPANY
    // =================================================

    app.get(
        "/company/delete/:id",
        async (req, res) => {

            await companies.deleteOne({

                _id:
                    new ObjectId(
                        req.params.id
                    )

            });


            res.redirect(
                "/companies"
            );

        }
    );


    // =================================================
    // PLACEMENT DRIVES
    // =================================================

    app.get(
        "/drives",
        async (req, res) => {

            const data =
                await drives
                    .find()
                    .toArray();


            res.render(
                "drives",
                {
                    data
                }
            );

        }
    );


    // =================================================
    // ADD DRIVE
    // =================================================

    app.get(
        "/drive/add",
        (req, res) => {

            if (!req.session.admin) {

                return res.redirect("/");

            }


            res.render(
                "addDrive"
            );

        }
    );


    app.post(
        "/drive/add",
        async (req, res) => {

            await drives.insertOne({

                company:
                    req.body.company,

                role:
                    req.body.role,

                mincgpa:
                    Number(
                        req.body.mincgpa
                    ),

                interviewDate:
                    req.body.interviewDate,

                deadline:
                    req.body.deadline,

                package:
                    req.body.package,

                description:
                    req.body.description

            });


            res.redirect(
                "/drives"
            );

        }
    );


    // =================================================
    // APPLY FOR DRIVE
    // =================================================

    app.get(
        "/apply/:id",
        async (req, res) => {

            if (!req.session.student) {

                return res.redirect("/");

            }


            try {

                const student =
                    await students.findOne({

                        usn:
                            req.session.student

                    });


                if (!student) {

                    return res.send(
                        "Student not found"
                    );

                }


                const drive =
                    await drives.findOne({

                        _id:
                            new ObjectId(
                                req.params.id
                            )

                    });


                if (!drive) {

                    return res.send(
                        "Drive not found"
                    );

                }


                // =================================
                // ELIGIBILITY
                // =================================

                if (
                    Number(student.cgpa) <
                    Number(drive.mincgpa)
                ) {

                    return res.send(
                        "Not Eligible"
                    );

                }


                // =================================
                // ALREADY APPLIED
                // =================================

                const existing =
                    await applications.findOne({

                        usn:
                            student.usn,

                        driveId:
                            drive._id

                    });


                if (existing) {

                    return res.send(
                        "Already Applied"
                    );

                }


                // =================================
                // APPLICATION
                // =================================

                await applications.insertOne({

                    usn:
                        student.usn,

                    name:
                        student.fullname,

                    email:
                        student.email,

                    driveId:
                        drive._id,

                    company:
                        drive.company,

                    role:
                        drive.role,

                    status:
                        "Applied",

                    appliedDate:
                        new Date()

                });


                res.redirect(
                    "/student/dashboard"
                );


            } catch (error) {

                console.error(error);

                res.status(500).send(
                    "Application error"
                );

            }

        }
    );


    // =================================================
    // APPLICATIONS
    // =================================================

    app.get(
        "/applications",
        async (req, res) => {

            const data =
                await applications
                    .find()
                    .toArray();


            res.render(
                "applications",
                {
                    data
                }
            );

        }
    );


    // =================================================
    // ADD INTERVIEW SLOT
    // =================================================

    app.get(
        "/interview-slots/add",
        async (req, res) => {

            if (!req.session.hr) {

                return res.redirect("/");

            }


            const company =
                req.session.hr;


            const drivesList =
                await drives.find({

                    company

                }).toArray();


            res.render(
                "addInterviewSlot",
                {

                    drives:
                        drivesList

                }
            );

        }
    );


    app.post(
        "/interview-slots/add",
        async (req, res) => {

            if (!req.session.hr) {

                return res.redirect("/");

            }


            const company =
                req.session.hr;


            await interviewSlots.insertOne({

                company,

                driveId:
                    new ObjectId(
                        req.body.driveId
                    ),

                date:
                    req.body.date,

                time:
                    req.body.time,

                mode:
                    req.body.mode,

                booked:
                    false,

                studentUSN:
                    null,

                createdAt:
                    new Date()

            });


            res.redirect(
                "/hr/dashboard"
            );

        }
    );


    // =================================================
    // STUDENT INTERVIEW SLOTS
    // =================================================

    app.get(
        "/student/interview-slots/:driveId",
        async (req, res) => {

            if (!req.session.student) {

                return res.redirect("/");

            }


            try {

                const driveId =
                    new ObjectId(
                        req.params.driveId
                    );


                const usn =
                    req.session.student;


                // =====================================
                // SHORTLIST CHECK
                // =====================================

                const application =
                    await applications.findOne({

                        usn,

                        driveId,

                        status:
                            "Shortlisted"

                    });


                if (!application) {

                    return res.send(
                        "You are not shortlisted for this drive."
                    );

                }


                // =====================================
                // AVAILABLE SLOTS
                // =====================================

                const slots =
                    await interviewSlots
                        .find({

                            driveId,

                            booked:
                                false

                        })
                        .sort({

                            date: 1,

                            time: 1

                        })
                        .toArray();


                // =====================================
                // DRIVE
                // =====================================

                const drive =
                    await drives.findOne({

                        _id:
                            driveId

                    });


                res.render(
                    "interviewSlots",
                    {

                        slots,

                        drive,

                        application

                    }
                );


            } catch (error) {

                console.error(
                    "INTERVIEW SLOT ERROR:",
                    error
                );

                res.status(500).send(
                    "Error loading interview slots"
                );

            }

        }
    );


    // =================================================
    // BOOK INTERVIEW SLOT
    // =================================================

    app.post(
        "/student/interview-slots/book",
        async (req, res) => {

            if (!req.session.student) {

                return res.redirect("/");

            }


            try {

                const slotId =
                    new ObjectId(
                        req.body.slotId
                    );


                const driveId =
                    new ObjectId(
                        req.body.driveId
                    );


                const usn =
                    req.session.student;


                // =====================================
                // SHORTLIST CHECK
                // =====================================

                const application =
                    await applications.findOne({

                        usn,

                        driveId,

                        status:
                            "Shortlisted"

                    });


                if (!application) {

                    return res.send(
                        "You are not shortlisted."
                    );

                }


                // =====================================
                // ALREADY BOOKED
                // =====================================

                if (
                    application.interviewSlotId
                ) {

                    return res.redirect(
                        "/student/dashboard"
                    );

                }


                // =====================================
                // BOOK SLOT
                // =====================================

                const result =
                    await interviewSlots
                        .findOneAndUpdate(

                            {

                                _id:
                                    slotId,

                                driveId,

                                booked:
                                    false

                            },

                            {

                                $set: {

                                    booked:
                                        true,

                                    studentUSN:
                                        usn,

                                    bookedAt:
                                        new Date()

                                }

                            },

                            {

                                returnDocument:
                                    "after"

                            }

                        );


                const bookedSlot =
                    result &&
                    result.value
                        ? result.value
                        : result;


                if (
                    !bookedSlot ||
                    !bookedSlot._id
                ) {

                    return res.send(
                        "Sorry, this slot has already been booked."
                    );

                }


                // =====================================
                // UPDATE APPLICATION
                // =====================================

                await applications.updateOne(

                    {

                        _id:
                            application._id

                    },

                    {

                        $set: {

                            status:
                                "Interview Scheduled",

                            interviewSlotId:
                                bookedSlot._id,

                            interviewDate:
                                bookedSlot.date,

                            interviewTime:
                                bookedSlot.time,

                            interviewMode:
                                bookedSlot.mode

                        }

                    }

                );


                res.redirect(
                    "/student/dashboard"
                );


            } catch (error) {

                console.error(
                    "BOOK SLOT ERROR:",
                    error
                );

                res.status(500).send(
                    "Error booking interview slot"
                );

            }

        }
    );


    // =================================================
    // HR DASHBOARD
    // =================================================

    app.get(
        "/hr/dashboard",
        async (req, res) => {

            if (!req.session.hr) {

                return res.redirect("/");

            }


            const company =
                req.session.hr;


            const data =
                await applications.find({

                    company

                }).toArray();


            res.render(
                "hrDashboard",
                {

                    company,

                    data

                }
            );

        }
    );


    // =================================================
    // SHORTLIST
    // =================================================

    app.get(
        "/shortlist/:id",
        async (req, res) => {

            if (!req.session.hr) {

                return res.redirect("/");

            }


            try {

                const application =
                    await applications.findOne({

                        _id:
                            new ObjectId(
                                req.params.id
                            )

                    });


                if (!application) {

                    return res.send(
                        "Application not found"
                    );

                }


                if (
                    application.company !==
                    req.session.hr
                ) {

                    return res.status(403).send(
                        "You cannot modify this application."
                    );

                }


                await applications.updateOne(

                    {

                        _id:
                            application._id

                    },

                    {

                        $set: {

                            status:
                                "Shortlisted"

                        }

                    }

                );


                res.redirect(
                    "/hr/dashboard"
                );


            } catch (error) {

                console.error(error);

                res.status(500).send(
                    "Error shortlisting application"
                );

            }

        }
    );


    // =================================================
    // REJECT
    // =================================================

    app.get(
        "/reject/:id",
        async (req, res) => {

            if (!req.session.hr) {

                return res.redirect("/");

            }


            try {

                const application =
                    await applications.findOne({

                        _id:
                            new ObjectId(
                                req.params.id
                            )

                    });


                if (!application) {

                    return res.send(
                        "Application not found"
                    );

                }


                if (
                    application.company !==
                    req.session.hr
                ) {

                    return res.status(403).send(
                        "You cannot modify this application."
                    );

                }


                await applications.updateOne(

                    {

                        _id:
                            application._id

                    },

                    {

                        $set: {

                            status:
                                "Rejected"

                        }

                    }

                );


                res.redirect(
                    "/hr/dashboard"
                );


            } catch (error) {

                console.error(error);

                res.status(500).send(
                    "Error rejecting application"
                );

            }

        }
    );


    // =================================================
    // MANUAL INTERVIEW
    // =================================================

    app.post(
        "/interview/:id",
        async (req, res) => {

            if (!req.session.hr) {

                return res.redirect("/");

            }


            const application =
                await applications.findOne({

                    _id:
                        new ObjectId(
                            req.params.id
                        )

                });


            if (!application) {

                return res.send(
                    "Application not found"
                );

            }


            if (
                application.company !==
                req.session.hr
            ) {

                return res.status(403).send(
                    "You cannot modify this application."
                );

            }


            await applications.updateOne(

                {

                    _id:
                        application._id

                },

                {

                    $set: {

                        status:
                            "Interview Scheduled",

                        interviewDate:
                            req.body.date,

                        interviewTime:
                            req.body.time,

                        interviewMode:
                            req.body.mode

                    }

                }

            );


            res.redirect(
                "/hr/dashboard"
            );

        }
    );


    // =================================================
    // FINAL SELECTION
    // =================================================

    app.get(
        "/select/:id",
        async (req, res) => {

            if (!req.session.hr) {

                return res.redirect("/");

            }


            try {

                const application =
                    await applications.findOne({

                        _id:
                            new ObjectId(
                                req.params.id
                            )

                    });


                if (!application) {

                    return res.send(
                        "Application not found"
                    );

                }


                if (
                    application.company !==
                    req.session.hr
                ) {

                    return res.status(403).send(
                        "You cannot modify this application."
                    );

                }


                await applications.updateOne(

                    {

                        _id:
                            application._id

                    },

                    {

                        $set: {

                            status:
                                "Selected"

                        }

                    }

                );


                res.redirect(
                    "/hr/dashboard"
                );


            } catch (error) {

                console.error(error);

                res.status(500).send(
                    "Error selecting student"
                );

            }

        }
    );


    // =================================================
    // ATS SCANNER
    // =================================================

    app.get(
        "/ats/scan/:usn/:driveId",
        async (req, res) => {

            try {

                // =====================================
                // HR LOGIN
                // =====================================

                if (!req.session.hr) {

                    return res.redirect("/");

                }


                const usn =
                    req.params.usn
                        .toUpperCase();


                // =====================================
                // STUDENT
                // =====================================

                const student =
                    await students.findOne({

                        usn

                    });


                if (!student) {

                    return res.send(
                        "Student not found"
                    );

                }


                // =====================================
                // DRIVE ID
                // =====================================

                let driveId;


                try {

                    driveId =
                        new ObjectId(
                            req.params.driveId
                        );

                } catch (error) {

                    return res.send(
                        "Invalid Drive ID"
                    );

                }


                // =====================================
                // DRIVE
                // =====================================

                const drive =
                    await drives.findOne({

                        _id:
                            driveId

                    });


                if (!drive) {

                    return res.send(
                        "Drive not found"
                    );

                }


                // =====================================
                // CHECK COMPANY
                // =====================================

                if (
                    drive.company !==
                    req.session.hr
                ) {

                    return res.status(403).send(
                        "You cannot scan applications for another company."
                    );

                }


                // =====================================
                // APPLICATION
                // =====================================

                const application =
                    await applications.findOne({

                        usn:
                            student.usn,

                        driveId:
                            drive._id

                    });


                if (!application) {

                    return res.send(
                        "Student has not applied for this drive."
                    );

                }


                // =====================================
                // RESUME
                // =====================================

                if (!student.resume) {

                    return res.send(
                        "Student has not uploaded a resume."
                    );

                }


                // =====================================
                // RESUME BUFFER
                // =====================================

                let resumeBuffer;


                if (
                    Buffer.isBuffer(
                        student.resume
                    )
                ) {

                    resumeBuffer =
                        student.resume;

                }

                else if (
                    student.resume &&
                    student.resume.buffer
                ) {

                    resumeBuffer =
                        Buffer.from(
                            student.resume.buffer
                        );

                }

                else if (
                    student.resume &&
                    student.resume.$binary &&
                    student.resume.$binary.base64
                ) {

                    resumeBuffer =
                        Buffer.from(

                            student.resume
                                .$binary
                                .base64,

                            "base64"

                        );

                }

                else {

                    return res.status(500)
                        .send(
                            "Invalid resume data."
                        );

                }


                // =====================================
                // EMPTY RESUME
                // =====================================

                if (
                    !resumeBuffer ||
                    resumeBuffer.length === 0
                ) {

                    return res.send(
                        "Resume file is empty."
                    );

                }


                // =====================================
                // PDF PARSING
                // =====================================

                let resumeText = "";


                try {

                    const parser =
                        new PDFParse({

                            data:
                                resumeBuffer

                        });


                    const pdfData =
                        await parser.getText();


                    resumeText =
                        pdfData.text || "";


                    await parser.destroy();


                } catch (error) {

                    console.error(
                        "PDF ERROR:",
                        error
                    );

                    return res.status(500)
                        .send(

                            "Could not read PDF: " +
                            error.message

                        );

                }


                // =====================================
                // TEXT CHECK
                // =====================================

                if (
                    !resumeText.trim()
                ) {

                    return res.send(

                        "No readable text found in resume. Please upload a text-based PDF."

                    );

                }


                // =====================================
                // ATS
                // =====================================

                const ats =
                    calculateATS(

                        resumeText,

                        drive.description || ""

                    );


                // =====================================
                // UPDATE APPLICATION
                // =====================================

                const updateData = {

                    atsScore:
                        ats.score,

                    matchedSkills:
                        ats.matchedSkills,

                    missingSkills:
                        ats.missingSkills,

                    atsResult:
                        ats.result,

                    atsScannedAt:
                        new Date()

                };


                // =====================================
                // AUTOMATIC SHORTLIST
                // =====================================

                if (
                    ats.score >= 70
                ) {

                    updateData.status =
                        "Shortlisted";


                    console.log(

                        "STUDENT SHORTLISTED:",

                        student.usn

                    );

                }


                else {

                    console.log(

                        "STUDENT NOT SHORTLISTED:",

                        student.usn

                    );

                }


                await applications.updateOne(

                    {

                        _id:
                            application._id

                    },

                    {

                        $set:
                            updateData

                    }

                );


                // =====================================
                // SHOW ATS RESULT
                // =====================================

                res.render(

                    "atsResult",

                    {

                        student,

                        drive,

                        ats

                    }

                );


            } catch (error) {

                console.error(
                    "=============================="
                );

                console.error(
                    "ATS SCANNER ERROR:"
                );

                console.error(error);

                console.error(
                    "=============================="
                );


                res.status(500).send(

                    "ATS Error: " +
                    error.message

                );

            }

        }
    );


    // =================================================
    // ANNOUNCEMENT
    // =================================================

    app.get(
        "/announcement/add",
        (req, res) => {

            res.render(
                "announcement"
            );

        }
    );


    app.post(
        "/announcement/add",
        async (req, res) => {

            await announcements.insertOne({

                title:
                    req.body.title,

                message:
                    req.body.message,

                date:
                    new Date()

            });


            res.redirect(
                "/admin"
            );

        }
    );


    // =================================================
    // SERVER
    // =================================================

    app.listen(
        5000,
        () => {

            console.log(
                "================================"
            );

            console.log(
                "Campus Placement Portal"
            );

            console.log(
                "Server running on:"
            );

            console.log(
                "http://localhost:5000"
            );

            console.log(
                "================================"
            );

        }
    );

}


// =====================================================
// START APPLICATION
// =====================================================

main().catch(
    console.error
);