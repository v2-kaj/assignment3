const express = require("express");
const mysql = require('mysql2');
// Set up the session middleware
const session = require('express-session');



const connection = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gms',
    waitForConnections: true,
    connectionLimit: 10, // Adjust the connection limit as needed
    queueLimit: 0,
});

const port = 8000

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }))
app.use(session({ secret: 'group8-group8', resave: false, saveUninitialized: true }));
const generateRegNumber = async (program_id) => {
    try {
        const program = await queryProgram(program_id);
        const currentYear = new Date().getFullYear();
        const yearLastTwoDigits = currentYear % 100;
        const program_abbreviation = program[0].abbreviation;

        const result = await queryLastRegNumber(program_id);


        if (result.length > 0) {
            const lastRegNumber = result[0].regnumber;
            const regnumberLastThreeDigits = extractLastThreeDigits(lastRegNumber);
            const newLastThreeDigits = (parseInt(regnumberLastThreeDigits) + 1).toString().padStart(3, '0');
            return `${program_abbreviation}/${yearLastTwoDigits}/SS/${newLastThreeDigits}`;
        } else {
            const lastRegNumber = "RE/21/SS/000";
            const regnumberLastThreeDigits = extractLastThreeDigits(lastRegNumber);
            const newLastThreeDigits = (parseInt(regnumberLastThreeDigits) + 1).toString().padStart(3, '0');
            return `${program_abbreviation}/${yearLastTwoDigits}/SS/${newLastThreeDigits}`;
        }



    } catch (error) {
        console.error(error);
        throw error;
    }
};


//helper function
function insertModuleIntoDatabase(moduleCode, lectureId) {
    const data = {
        module_code: moduleCode,
        lecturer_id: lectureId
    }
    connection.query("INSERT INTO lecturer_module SET?", data, (error, results) => {
        console.log("SMMSMSMSMSM")
        if (error) {
            console.log(error)
        }

    })

}

// Helper function to query the program
function queryProgram(program_id) {
    return new Promise((resolve, reject) => {
        const query = "SELECT * FROM programs WHERE program_id = ?";
        connection.query(query, [program_id], (error, program) => {
            if (error) {
                reject(error);
            } else {
                resolve(program);
            }
        });
    });
}

// Helper function to query the last registration number
function queryLastRegNumber(program_id) {
    return new Promise((resolve, reject) => {
        const query = "SELECT regnumber FROM students WHERE program_id = ? ORDER BY regnumber DESC LIMIT 1";
        connection.query(query, [program_id], (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
}

// Helper function to extract the last three digits
function extractLastThreeDigits(inputString) {
    const regex = /(\d{3})$/;
    const match = inputString.match(regex);
    if (match) {
        return match[1];
    } else {
        console.log("No match found.");
        return "000";
    }
}


app.get("/", (req, res) => {
    const data = {
        title: "Dashboard",
        active: "Dashboard"
    };
    res.render("index", data);
});

app.get("/students", (req, res) => {
    connection.query("SELECT * FROM students", (error, students) => {
        const data = {
            title: "Students",
            active: "Students",
            students: students,
        };
        res.render("students", data);
    });
})

app.get("/students/add-student", (req, res) => {

    connection.query("SELECT * FROM programs", (error, programs) => {
        if (error) {
            console.log(error);
        } else {
            const data = {
                title: "Add Student",
                active: "Add",
                programs: programs,
            };
            res.render("addStudent", data);
        }
    });
});

app.post("/students/add-student", (req, res) => {
    // Extract the form data from the request
    const { firstname, lastname, regnumber } = req.body;
    const program_id = parseInt(req.body.program, 10);
    if (regnumber === undefined) {
        generateRegNumber(program_id)
            .then(regnumber => {
                console.log("Generated Registration Number:", regnumber);
                const studentData = {
                    regnumber,
                    firstname,
                    lastname,
                    program_id,
                }
                connection.query("INSERT INTO students SET?", studentData, (error, results) => {
                    if (error) {
                        console.log(error)
                    }
                    else {
                        res.redirect("/students/add-student")
                    }
                })
            })
            .catch(error => {
                console.error("Error:", error);
            });
    }
    else {
        const studentData = {
            regnumber,
            firstname,
            lastname,
            program_id,
        }

        connection.query("INSERT INTO students SET?", studentData, (error, results) => {
            if (error) {
                console.log(error)
            }
            else {
                res.redirect("/students/add-student")
            }
        })
    }
})


app.post("/students/add-student/verify", (req, res) => {
    // Extract the form data from the request
    const { firstname, lastname } = req.body;
    const program_id = parseInt(req.body.program, 10);

    generateRegNumber(program_id)
        .then(regnumber => {
            console.log("Generated Registration Number:", regnumber);
            const studentData = {
                title: "Students",
                active: "Students",
                regnumber,
                firstname,
                lastname,
                program_id,
            }
            res.render("addStudentVerify", studentData)
        })
        .catch(error => {
            console.error("Error:", error);
        });
})



app.get("/lecturers", (req, res) => {
    connection.query("SELECT * FROM lecturers", (error, lecturers) => {
        const data = {
            title: "Lecturers",
            active: "Lecturers",
            lecturers: lecturers,
        };
        res.render("lecturers", data);
    });
})

app.get("/lecturers/add-lecturer", (req, res) => {
    connection.query("SELECT * FROM departments", (error, departments) => {

        const data = {
            title: "Lecturers",
            active: "Lecturers",
            departments: departments,
        }
        res.render("addLecturer", data);

    })

})
app.post("/lecturers/add-lecturer", (req, res) => {
    // Extract the form data from the request
    const { firstname, lastname } = req.body;
    const department = parseInt(req.body.department, 10);
    const lecturerData = {
        firstname,
        lastname,
        department,
    }
    connection.query("INSERT INTO lecturers SET?", lecturerData, (error, results) => {
        if (error) {
            console.log(error)
        }
        else {
            req.session.lecturerId = results.insertId
            req.session.lecturerName = `${firstname} ${lastname}`

            res.redirect(`/lecturers/add-module/${department}`)
        }
    })
})
//add module to the lecturer

//student home page
app.get("/student", (req, res) => {
    const data = {
        title: "Student",
        active: "Student"
    };
    res.render("student", data);
});

app.get("/student/update-profile", (req, res) => {
    const data = {
        title: "Student",
        active: "Student"
    };
    res.render("updateProfile", data);
});


// add module to a lecture
app.get('/lecturers/add-module/:department', (req, res) => {
    const id = req.params.department;
    connection.query("SELECT * FROM modules WHERE department_id = ? ", [id], (error, modules) => {
        const data = {
            title: "Lecturers",
            active: "Lecturers",
            lecturerName: req.session.lecturerName,
            modules: modules,
        }
        res.render("addModule", data)


    })

});

app.post('/lecturers/add-modules', (req, res) => {
    const selectedModules = req.body.modules;
    if (selectedModules && selectedModules.length > 0) {
        // Iterate over the selected modules and insert each one into the database
        selectedModules.forEach((moduleCode) => {
            const storedId = req.session.lecturerId;
            if (storedId !== undefined) {
                insertModuleIntoDatabase(moduleCode, storedId);
            } else {
                res.send('No ID found in the session.');
            }

        });

        res.redirect('/lecturers/add-lecturer');
    } else {
        res.send('No modules selected to insert.');

        res.send('Form submitted successfully!');
    }
});

// Define a route to view assigned modules for a lecturer
app.get('/lecturers/:lecturerId/modules', (req, res) => {
    const lecturerId = req.params.lecturerId;

    // Query the database to fetch assigned modules for the lecturer
    const query = `SELECT lm.*, m.title, l.* FROM lecturer_module lm INNER JOIN modules m ON lm.module_code = m.code INNER JOIN lecturers l ON lm.lecturer_id = l.id WHERE lm.lecturer_id = ?;`;

    connection.query(query, [lecturerId], (error, results) => {
        if (error) {
            console.error('Error fetching assigned modules:', error);
            res.status(500).send('An error occurred while fetching assigned modules.');
            return;
        }
        console.log(results)
        const data = {
            lecturerId: lecturerId,
            title: "Lecturer Modules",
            active: 'Lecturers',
            modules: results,
            lecturerName: `${results[0].firstname} ${results[0].lastname}`,
        }

        // Render the page with the module information
        res.render('lecturerModules', data);
    });
});

// Route to render the form for adding an assessment
app.get('/lecturers/add-assessment', (req, res) => {
    // Replace this with the actual lecturer's ID from the session
    const lecturerId = 16;
    const query = `
    SELECT lm.*, m.code
    FROM lecturer_module lm 
    INNER JOIN modules m 
    ON lm.module_code = m.code 
    WHERE lm.lecturer_id = ?;`;

    connection.query(query, [lecturerId], (error, results) => {
        
        const data = {
            title: "Add Assessment",
            active: "Assessments",
            lecturerId: lecturerId,
            modules: results,
            

        }
        res.render('addAssessment', data);
    })
});

// Route to handle the form submission and insert the assessment
app.post('/lecturers/add-assessment', (req, res) => {
    const { name, type, total_marks, module_code, weight, scheduled_date, lecturer_id } = req.body;

    // Insert the assessment into the database
    const query = `
      INSERT INTO assessments (name, type, total_marks, module_code, weight, scheduled_date, lecturer_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    connection.query(
        query,
        [name, type, total_marks, module_code, weight, scheduled_date, lecturer_id],
        (error, results) => {
            if (error) {
                console.error('Error inserting assessment:', error);
                res.status(500).send('An error occurred while adding the assessment.');
                return;
            }
            res.redirect('/lecturers/add-assessment');
        }
    );
});


app.listen(port, () => {
    console.log(`server started at port ${port}`);
});