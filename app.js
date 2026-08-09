const express = require('express');
const cors = require('cors');
const multer = require('multer');
const session = require('express-session');
const { MongoClient, ObjectId } = require('mongodb');
const { PDFParse } = require('pdf-parse');
const app = express();

const url = "mongodb://karthikng:karthikng@ac-zbt2esd-shard-00-00.qsvcm0e.mongodb.net:27017,ac-zbt2esd-shard-00-01.qsvcm0e.mongodb.net:27017,ac-zbt2esd-shard-00-02.qsvcm0e.mongodb.net:27017/?ssl=true&replicaSet=atlas-f2a2zr-shard-0&authSource=admin&appName=Cluster0";
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use(express.static("public"));

app.set("view engine", "ejs");

app.use(
    session({
        secret: "placementportal",
        resave: false,
        saveUninitialized: false
    })
);

const upload = multer({
    storage: multer.memoryStorage()
});

const client = new MongoClient(url);
function calculateATS(resumeText, jobDescription) {

    const resume = (resumeText || "").toLowerCase();
    const job = (jobDescription || "").toLowerCase();

    // Skills that ATS will check
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

    // =====================================
    // 1. FIND SKILLS PRESENT IN RESUME PDF
    // =====================================

    const resumeSkills = [];

    for (let skill of skills) {

        if (resume.includes(skill)) {

            resumeSkills.push(skill);

        }

    }

    // =====================================
    // 2. FIND SKILLS REQUIRED BY JOB
    // =====================================

    const requiredSkills = [];

    for (let skill of skills) {

        if (job.includes(skill)) {

            requiredSkills.push(skill);

        }

    }

    // =====================================
    // 3. COMPARE RESUME WITH JOB
    // =====================================

    const matchedSkills = [];
    const missingSkills = [];

    for (let skill of requiredSkills) {

        if (resumeSkills.includes(skill)) {

            matchedSkills.push(skill);

        } else {

            missingSkills.push(skill);

        }

    }

    // =====================================
    // 4. CALCULATE ATS SCORE
    // =====================================

    let score = 0;

    if (requiredSkills.length > 0) {

        score = Math.round(
            (matchedSkills.length / requiredSkills.length) * 100
        );

    }

    // =====================================
    // 5. ATS RESULT
    // =====================================

    let result;

    if (score >= 80) {

        result = "Excellent Match";

    } else if (score >= 60) {

        result = "Good Match";

    } else if (score >= 40) {

        result = "Average Match";

    } else {

        result = "Low Match";

    }

    // =====================================
    // DEBUG
    // =====================================

    console.log("================================");
    console.log("ATS SCAN");
    console.log("Resume Skills:", resumeSkills);
    console.log("Required Skills:", requiredSkills);
    console.log("Matched Skills:", matchedSkills);
    console.log("Missing Skills:", missingSkills);
    console.log("ATS Score:", score);
    console.log("================================");

    // =====================================
    // RETURN RESULT
    // =====================================

    return {

        score: score,

        result: result,

        resumeSkills: resumeSkills,

        requiredSkills: requiredSkills,

        matchedSkills: matchedSkills,

        missingSkills: missingSkills

    };
}

async function main() {

    await client.connect();

    console.log("MongoDB Connected");

    const db = client.db("college");

    const users = db.collection("users");
    const students = db.collection("students");
    const companies = db.collection("companies");
    const drives = db.collection("drives");
    const applications = db.collection("applications");
    const announcements = db.collection("announcements");
    const interviewSlots = db.collection("interviewSlots");
    // =========================
    // HOME
    // =========================

app.get("/", async (req, res) => {

    const companiesList = await companies.find().toArray();

    res.render("login", {
        error: "",
        companiesList
    });

});

    // =========================
    // ADMIN REGISTER
    // =========================

    app.get("/register", (req, res) => {
        res.render("signup", {
            error: ""
        });
    });

    app.post("/register", async (req, res) => {

        const { name, email, password } = req.body;

        const existing = await users.findOne({
            email: email
        });

        if (existing) {
            return res.render("signup", {
                error: "User already exists"
            });
        }

        await users.insertOne({
            name,
            email,
            password,
            role: "admin"
        });

        res.redirect("/");
    });

    // =========================
    // LOGIN
    // =========================

    app.post("/login", async (req, res) => {

    const email = req.body.email;
    const password = req.body.password;

    // =========================
    // ADMIN LOGIN
    // =========================

    const admin = await users.findOne({
        email,
        password
    });

    if (admin) {

        req.session.admin = admin.email;

        return res.redirect("/admin");
    }

    // =========================
    // STUDENT LOGIN
    // =========================

    const student = await students.findOne({
        email: email,
        usn: password.toUpperCase()
    });

    if (student) {

        req.session.student = student.usn;

        return res.redirect("/student/dashboard");
    }

    // =========================
    // HR LOGIN
    // =========================

    const hr = await companies.findOne({
        email: email
    });

    if (hr && password === "company123") {

        req.session.hr = hr.company;

        return res.redirect("/hr/dashboard");
    }

    // =========================
    // WRONG LOGIN
    // =========================

    const companiesList = await companies.find().toArray();

    return res.render("login", {
        error: "Invalid email or password",
        companiesList: companiesList
    });

});

    // =========================
    // LOGOUT
    // =========================

    app.get("/logout", (req, res) => {

        req.session.destroy(() => {
            res.redirect("/");
        });

    });

    // =========================
    // ADMIN DASHBOARD
    // =========================

    app.get("/admin", async (req, res) => {

        if (!req.session.admin) {
            return res.redirect("/");
        }

        const totalStudents = await students.countDocuments();

        const totalCompanies = await companies.countDocuments();

        const totalDrives = await drives.countDocuments();

        const totalApplications = await applications.countDocuments();

        const selectedStudents = await applications.countDocuments({
            status: "Selected"
        });

        const data = await students.find().toArray();

        res.render("admin", {
            data,
            totalStudents,
            totalCompanies,
            totalDrives,
            totalApplications,
            selectedStudents
        });

    });
        // =========================
    // ADD STUDENT
    // =========================

    app.get("/add", (req, res) => {

        if (!req.session.admin) {
            return res.redirect("/");
        }

        res.render("add");

    });

    app.post("/add", upload.single("photo"), async (req, res) => {

        const {
            usn,
            fullname,
            email,
            branch,
            sem,
            cgpa
        } = req.body;

        const existing = await students.findOne({
            usn: usn.toUpperCase()
        });

        if (existing) {
            return res.send("Student already exists");
        }

       await students.insertOne({

    usn: usn.toUpperCase(),
    fullname,
    email,
    branch,
    sem: Number(sem),
    cgpa: Number(cgpa),

    photo: req.file ? req.file.buffer : null,

    contentType: req.file
        ? req.file.mimetype
        : null,

    resume: null,

    resumeName: null,

    resumeContentType: null,

    results: []

});

        res.redirect("/admin");

    });

    // =========================
    // STUDENT PHOTO
    // =========================

    app.get("/photo/:usn", async (req, res) => {

    try {

        const student = await students.findOne({
            usn: req.params.usn.toUpperCase()
        });

        if (!student || !student.photo) {
            return res.status(404).send("Photo not found");
        }

        // MongoDB may return the image as BSON Binary
        let photoBuffer;

        if (Buffer.isBuffer(student.photo)) {
            photoBuffer = student.photo;
        } 
        else if (student.photo.buffer) {
            photoBuffer = student.photo.buffer;
        } 
        else {
            photoBuffer = Buffer.from(student.photo);
        }

        res.set(
            "Content-Type",
            student.contentType || "image/jpeg"
        );

        res.send(photoBuffer);

    } catch (error) {

        console.error("PHOTO ERROR:", error);

        res.status(500).send("Error loading photo");
    }

});

    // =========================
    // DELETE STUDENT
    // =========================

    app.get("/delete/:usn", async (req, res) => {

        if (!req.session.admin) {
            return res.redirect("/");
        }

        await students.deleteOne({
            usn: req.params.usn.toUpperCase()
        });

        res.redirect("/admin");

    });

    // =========================
    // EDIT STUDENT
    // =========================

    app.get("/edit/:usn", async (req, res) => {

        if (!req.session.admin) {
            return res.redirect("/");
        }

        const student = await students.findOne({
            usn: req.params.usn.toUpperCase()
        });

        res.render("edit", {
            student
        });

    });

    app.post("/edit/:usn",
        upload.single("photo"),
        async (req, res) => {

        const data = {

            fullname: req.body.fullname,
            email: req.body.email,
            branch: req.body.branch,
            sem: Number(req.body.sem),
            cgpa: Number(req.body.cgpa)

        };

        if (req.file) {

            data.photo = req.file.buffer;

            data.contentType =
                req.file.mimetype;
        }

        await students.updateOne(
            {
                usn: req.params.usn.toUpperCase()
            },
            {
                $set: data
            }
        );

        res.redirect("/admin");

    });

    // =========================
    // SEARCH STUDENT
    // =========================

    app.get("/search", async (req, res) => {

        const keyword =
            req.query.keyword || "";

        const data = await students.find({

            fullname: {
                $regex: keyword,
                $options: "i"
            }

        }).toArray();

        res.render("search", {
            data
        });

    });
    // =========================
// STUDENT UPLOAD RESUME
// =========================

app.post(
    "/student/upload-resume",
    upload.single("resume"),
    async (req, res) => {

        if (!req.session.student) {
            return res.redirect("/");
        }

        if (!req.file) {
            return res.send("Please select a resume");
        }

        if (req.file.mimetype !== "application/pdf") {
            return res.send("Only PDF resumes are allowed");
        }

        await students.updateOne(
            {
                usn: req.session.student
            },
            {
                $set: {

                    resume: req.file.buffer,

                    resumeName: req.file.originalname,

                    resumeContentType: req.file.mimetype

                }
            }
        );

        res.redirect("/student/dashboard");

    }
);
// =========================
// VIEW STUDENT RESUME
// =========================

app.get("/student/resume", async (req, res) => {

    if (!req.session.student) {
        return res.redirect("/");
    }

    const student = await students.findOne({
        usn: req.session.student
    });

    if (!student || !student.resume) {
        return res.send("Resume not found");
    }

    res.set(
        "Content-Type",
        student.resumeContentType || "application/pdf"
    );

    res.send(student.resume);

});

    // =========================
    // STUDENT PROFILE
    // =========================

    app.get("/student/dashboard",
        async (req, res) => {

        if (!req.session.student) {
            return res.redirect("/");
        }

        const student =
            await students.findOne({
                usn: req.session.student
            });

        const companiesList =
            await drives.find().toArray();

        const myApplications =
            await applications.find({
                usn: req.session.student
            }).toArray();

        const news =
            await announcements.find()
            .sort({ date: -1 })
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

    });

    // =========================
    // STUDENT DETAILS PAGE
    // =========================

    app.get("/student/:usn",
        async (req, res) => {

        const student =
            await students.findOne({
                usn: req.params.usn
            });

        res.render("student", {
            student
        });

    });
        // =========================
    // ADD RESULT
    // =========================

    app.get("/result/:usn", async (req, res) => {

        if (!req.session.admin) {
            return res.redirect("/");
        }

        const student = await students.findOne({
            usn: req.params.usn.toUpperCase()
        });

        res.render("result", {
            student
        });

    });

    app.post("/result/:usn", async (req, res) => {

        const result = {

            sem: Number(req.body.semester),

            subjects: [

                {
                    subject: req.body.sub1,
                    marks: Number(req.body.mark1)
                },

                {
                    subject: req.body.sub2,
                    marks: Number(req.body.mark2)
                },

                {
                    subject: req.body.sub3,
                    marks: Number(req.body.mark3)
                },

                {
                    subject: req.body.sub4,
                    marks: Number(req.body.mark4)
                },

                {
                    subject: req.body.sub5,
                    marks: Number(req.body.mark5)
                },

                {
                    subject: req.body.sub6,
                    marks: Number(req.body.mark6)
                }

            ],

            percentage: Number(req.body.percentage),

            cgpa: Number(req.body.cgpa),

            published: true
        };

        await students.updateOne(
            {
                usn: req.params.usn.toUpperCase()
            },
            {
                $push: {
                    results: result
                }
            }
        );

        res.redirect("/admin");

    });

    // =========================
    // SEMESTER RESULT
    // =========================

    app.get("/student/result/:sem",
        async (req, res) => {

        if (!req.session.student) {
            return res.redirect("/");
        }

        const student =
            await students.findOne({
                usn: req.session.student
            });

        const sem =
            Number(req.params.sem);

        const result =
            student.results.find(
                item => item.sem === sem
            );

        res.render("semResult", {
            student,
            sem,
            result
        });

    });

    // =========================
    // COMPANY LIST
    // =========================

    app.get("/companies",
        async (req, res) => {

        const data =
            await companies.find().toArray();

        res.render("companies", {
            data
        });

    });

    // =========================
    // ADD COMPANY
    // =========================

    app.get("/company/add",
        (req, res) => {

        if (!req.session.admin) {
            return res.redirect("/");
        }

        res.render("addCompany");

    });

   app.post(
    "/company/add",
    upload.single("logo"),
    async (req, res) => {

        await companies.insertOne({

            company: req.body.company,

            email: req.body.email,

            password: "company123",

            role: req.body.role,

            package: req.body.package,

            mincgpa: Number(req.body.mincgpa),

            deadline: req.body.deadline,

            description: req.body.description,

            // COMPANY LOGO
            logo: req.file
                ? req.file.buffer
                : null,

            logoContentType: req.file
                ? req.file.mimetype
                : null

        });

        res.redirect("/companies");

    }
);
// =========================
// COMPANY LOGO
// =========================

app.get("/company/logo/:id", async (req, res) => {

    try {

        const company = await companies.findOne({
            _id: new ObjectId(req.params.id)
        });

        if (!company || !company.logo) {
            return res.status(404).send("Logo not found");
        }

        let logoBuffer;

        if (Buffer.isBuffer(company.logo)) {

            logoBuffer = company.logo;

        } else if (company.logo.buffer) {

            logoBuffer = company.logo.buffer;

        } else {

            logoBuffer = Buffer.from(company.logo);

        }

        res.set(
            "Content-Type",
            company.logoContentType || "image/png"
        );

        res.send(logoBuffer);

    } catch (error) {

        console.error("COMPANY LOGO ERROR:", error);

        res.status(500).send("Error loading logo");

    }

});

    app.post("/company/edit/:id",
        async (req, res) => {

        await companies.updateOne(
            {
                _id: new ObjectId(
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

                    mincgpa: Number(
                        req.body.mincgpa
                    ),

                    deadline:
                        req.body.deadline,

                    description:
                        req.body.description
                }
            }
        );

        res.redirect("/companies");

    });

    // =========================
    // DELETE COMPANY
    // =========================

    app.get("/company/delete/:id",
        async (req, res) => {

        await companies.deleteOne({
            _id: new ObjectId(
                req.params.id
            )
        });

        res.redirect("/companies");

    });
        // =========================
    // PLACEMENT DRIVES
    // =========================

    app.get("/drives", async (req, res) => {

        const data =
            await drives.find().toArray();

        res.render("drives", {
            data
        });

    });

    app.get("/drive/add", (req, res) => {

        if (!req.session.admin) {
            return res.redirect("/");
        }

        res.render("addDrive");

    });

    app.post("/drive/add", async (req, res) => {

    await drives.insertOne({

        company: req.body.company,

        role: req.body.role,

        mincgpa: Number(
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

    res.redirect("/drives");

});

    // =========================
    // APPLY FOR DRIVE
    // =========================

    app.get("/apply/:id",
        async (req, res) => {

        if (!req.session.student) {
            return res.redirect("/");
        }

        const student =
            await students.findOne({
                usn: req.session.student
            });

        const drive =
            await drives.findOne({
                _id: new ObjectId(
                    req.params.id
                )
            });

        if (!drive) {
            return res.send(
                "Drive Not Found"
            );
        }

        if (
            Number(student.cgpa) <
            Number(drive.mincgpa)
        ) {
            return res.send(
                "Not Eligible"
            );
        }

        const existing =
            await applications.findOne({
                usn: student.usn,
                driveId: drive._id
            });

        if (existing) {
            return res.send(
                "Already Applied"
            );
        }

        await applications.insertOne({

            usn: student.usn,

            name: student.fullname,

            email: student.email,

            driveId: drive._id,

            company: drive.company,

            role: drive.role,

            status: "Applied",

            appliedDate: new Date()

        });

        res.redirect(
            "/student/dashboard"
        );

    });

    // =========================
    // APPLICATIONS
    // =========================

    app.get("/applications",
        async (req, res) => {

        const data =
            await applications.find()
            .toArray();

        res.render(
            "applications",
            {
                data
            }
        );

    });
    // =========================
// ADD INTERVIEW SLOT
// =========================

app.get("/interview-slots/add", async (req, res) => {

    if (!req.session.hr) {
        return res.redirect("/");
    }

    const company = req.session.hr;

    const drivesList = await drives.find({
        company: company
    }).toArray();

    res.render("addInterviewSlot", {
        drives: drivesList
    });

});


app.post("/interview-slots/add", async (req, res) => {

    if (!req.session.hr) {
        return res.redirect("/");
    }

    const company = req.session.hr;

    await interviewSlots.insertOne({

        company: company,

        driveId: new ObjectId(
            req.body.driveId
        ),

        date: req.body.date,

        time: req.body.time,

        mode: req.body.mode,

        booked: false,

        studentUSN: null,

        createdAt: new Date()

    });

    res.redirect("/hr/dashboard");

});
// =========================
// SELECT INTERVIEW SLOT
// =========================

app.get(
    "/student/interview-slots/:driveId",
    async (req, res) => {

        if (!req.session.student) {
            return res.redirect("/");
        }

        try {

            const driveId =
                new ObjectId(req.params.driveId);

            const usn =
                req.session.student;


            // =========================
            // CHECK SHORTLIST
            // =========================

            const application =
                await applications.findOne({

                    usn: usn,

                    driveId: driveId,

                    status: "Shortlisted"

                });

            if (!application) {

                return res.send(
                    "You are not shortlisted for this drive."
                );

            }


            // =========================
            // GET AVAILABLE SLOTS
            // =========================

            const slots =
                await interviewSlots.find({

                    driveId: driveId,

                    booked: false

                })
                .sort({
                    date: 1,
                    time: 1
                })
                .toArray();


            // =========================
            // GET DRIVE
            // =========================

            const drive =
                await drives.findOne({
                    _id: driveId
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
// =========================
// BOOK INTERVIEW SLOT
// =========================

app.post(
    "/student/interview-slots/book",
    async (req, res) => {

        if (!req.session.student) {
            return res.redirect("/");
        }

        try {

            const slotId =
                new ObjectId(req.body.slotId);

            const driveId =
                new ObjectId(req.body.driveId);

            const usn =
                req.session.student;


            // =========================
            // CHECK SHORTLIST
            // =========================

            const application =
                await applications.findOne({

                    usn: usn,

                    driveId: driveId,

                    status: "Shortlisted"

                });

            if (!application) {

                return res.send(
                    "You are not shortlisted."
                );

            }


            // =========================
            // BOOK SLOT
            // =========================

            const slot =
                await interviewSlots.findOneAndUpdate(

                    {
                        _id: slotId,

                        driveId: driveId,

                        booked: false
                    },

                    {
                        $set: {

                            booked: true,

                            studentUSN: usn,

                            bookedAt: new Date()

                        }
                    },

                    {
                        returnDocument: "after"
                    }

                );


            if (!slot.value) {

                return res.send(
                    "Sorry, this slot has already been booked."
                );

            }


            // =========================
            // UPDATE APPLICATION
            // =========================

            await applications.updateOne(

                {
                    _id: application._id
                },

                {
                    $set: {

                        status:
                            "Interview Scheduled",

                        interviewSlotId:
                            slotId,

                        interviewDate:
                            slot.value.date,

                        interviewTime:
                            slot.value.time,

                        interviewMode:
                            slot.value.mode

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

    // =========================
    // HR DASHBOARD
    // =========================

    app.get("/hr/dashboard",
        async (req, res) => {

        if (!req.session.hr) {
            return res.redirect("/");
        }

        const company =
            req.session.hr;

        const data =
            await applications.find({
                company: company
            }).toArray();

        res.render(
            "hrDashboard",
            {
                company,
                data
            }
        );

    });

    // =========================
    // SHORTLIST
    // =========================

    app.get("/shortlist/:id",
        async (req, res) => {

        await applications.updateOne(
            {
                _id: new ObjectId(
                    req.params.id
                )
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

    });

    // =========================
    // REJECT
    // =========================

    app.get("/reject/:id",
        async (req, res) => {

        await applications.updateOne(
            {
                _id: new ObjectId(
                    req.params.id
                )
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

    });

    // =========================
    // INTERVIEW
    // =========================

    app.post("/interview/:id",
        async (req, res) => {

        await applications.updateOne(
            {
                _id: new ObjectId(
                    req.params.id
                )
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

    });

    // =========================
    // FINAL SELECTION
    // =========================


app.get("/select/:id",
    async (req, res) => {

    if (!req.session.hr) {
        return res.redirect("/");
    }

    await applications.updateOne(
        {
            _id: new ObjectId(
                req.params.id
            )
        },
        {
            $set: {
                status: "Selected"
            }
        }
    );

    res.redirect(
        "/hr/dashboard"
    );

});
// =========================
// ATS RESUME SCANNER
// =========================

// =========================
// ATS RESUME SCANNER
// =========================

app.get(
    "/ats/scan/:usn/:driveId",
    async (req, res) => {

        try {

            // =========================
            // CHECK HR LOGIN
            // =========================

            if (!req.session.hr) {

                return res.redirect("/");

            }

            // =========================
            // GET STUDENT USN
            // =========================

            const usn =
                req.params.usn.toUpperCase();

            // =========================
            // FIND STUDENT
            // =========================

            const student =
                await students.findOne({
                    usn: usn
                });

            if (!student) {

                return res.send(
                    "Student not found"
                );

            }

            // =========================
            // CHECK RESUME
            // =========================

            if (!student.resume) {

                return res.send(
                    "Student has not uploaded a resume"
                );

            }

            // =========================
            // FIND DRIVE
            // =========================

            let drive;

            try {

                drive =
                    await drives.findOne({
                        _id: new ObjectId(
                            req.params.driveId
                        )
                    });

            } catch (error) {

                console.log(
                    "Drive ID Error:",
                    error
                );

                return res.send(
                    "Invalid Drive ID"
                );

            }

            if (!drive) {

                return res.send(
                    "Drive not found"
                );

            }

            console.log(
                "Student:",
                student.usn
            );

            console.log(
                "Company:",
                drive.company
            );

            // =========================
            // CONVERT RESUME TO BUFFER
            // =========================

            let resumeBuffer;

            // Normal MongoDB Buffer
            if (Buffer.isBuffer(student.resume)) {

                resumeBuffer =
                    student.resume;

            }

            // MongoDB Binary object
            else if (
                student.resume &&
                student.resume.buffer
            ) {

                resumeBuffer =
                    Buffer.from(
                        student.resume.buffer
                    );

            }

            // MongoDB $binary object
            else if (
                student.resume &&
                student.resume.$binary &&
                student.resume.$binary.base64
            ) {

                resumeBuffer =
                    Buffer.from(
                        student.resume.$binary.base64,
                        "base64"
                    );

            }

            else {

                console.log(
                    "Invalid resume type:",
                    typeof student.resume
                );

                return res.send(
                    "Invalid resume data stored in database"
                );

            }

            console.log(
                "Resume buffer size:",
                resumeBuffer.length
            );

            // =========================
            // CHECK EMPTY FILE
            // =========================

            if (resumeBuffer.length === 0) {

                return res.send(
                    "Resume file is empty"
                );

            }

            // =========================
            // PDF PARSING
            // =========================

            let resumeText = "";

            try {

                const parser =
                    new PDFParse({
                        data: resumeBuffer
                    });

                const pdfData =
                    await parser.getText();

                resumeText =
                    pdfData.text || "";

                await parser.destroy();

                console.log(
                    "PDF parsed successfully"
                );

            } catch (pdfError) {

                console.error(
                    "PDF PARSING ERROR:",
                    pdfError
                );

                return res.status(500).send(
                    "Error while reading resume PDF: " +
                    pdfError.message
                );

            }

            // =========================
            // CHECK EXTRACTED TEXT
            // =========================

            console.log(
                "Resume text length:",
                resumeText.length
            );

            if (!resumeText.trim()) {

                return res.send(
                    "PDF was opened but no text could be extracted. Please upload a text-based PDF resume."
                );

            }

            // =========================
            // RUN ATS
            // =========================

            const ats = calculateATS(
    resumeText,
    drive.description || ""
);

console.log("ATS Score:", ats.score);
console.log("Matched Skills:", ats.matchedSkills);
console.log("Missing Skills:", ats.missingSkills);


// =====================================
// FIND APPLICATION
// =====================================

const application = await applications.findOne({
    usn: student.usn,
    driveId: drive._id
});

if (!application) {

    return res.send(
        "Student has not applied for this drive"
    );

}


// =====================================
// AUTOMATIC SHORTLIST
// =====================================

if (ats.score > 70) {

    await applications.updateOne(
        {
            _id: application._id
        },
        {
            $set: {

                status: "Shortlisted",

                atsScore: ats.score,

                matchedSkills:
                    ats.matchedSkills,

                missingSkills:
                    ats.missingSkills,

                atsResult:
                    ats.result,

                atsScannedAt:
                    new Date()

            }
        }
    );

    console.log(
        "STUDENT SHORTLISTED:",
        student.usn
    );

} else {

    await applications.updateOne(
        {
            _id: application._id
        },
        {
            $set: {

                atsScore: ats.score,

                matchedSkills:
                    ats.matchedSkills,

                missingSkills:
                    ats.missingSkills,

                atsResult:
                    ats.result,

                atsScannedAt:
                    new Date()

            }
        }
    );

    console.log(
        "STUDENT NOT SHORTLISTED:",
        student.usn
    );

}

            // =========================
            // SHOW ATS RESULT
            // =========================

            res.render(
                "atsResult",
                {
                    student: student,
                    drive: drive,
                    ats: ats
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

    // =========================
    // ANNOUNCEMENTS
    // =========================

    app.get("/announcement/add",
        (req, res) => {

        res.render(
            "announcement"
        );

    });

    app.post("/announcement/add",
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

    });

    // =========================
    // SERVER
    // =========================

    app.listen(5000, () => {

        console.log(
            "Server running on port 5000"
        );

    });

}

main().catch(console.error);
