const express = require("express");
const app = express();
const pg = require("pg");
const client = new pg.Client(
  process.env.DATABASE_URL || "postgres://localhost/acme_hr_directory"
);

app.use(require("morgan")("dev"));
app.use(express.json());

//READ departments
app.get("/api/departments", async (req, res, next) => {
  try {
    const SQL = /* sql */ `
        SELECT * from departments
      `;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

//READ employees
app.get("/api/employees", async (req, res, next) => {
  try {
    const SQL = /* sql */ `
      SELECT * from employees
      `;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

//CREATE employee with foreign key
app.post("/api/employees", async (req, res, next) => {
  try {
    const SQL = /* sql */ `
        INSERT INTO employees(name, department_id)
        VALUES($1, $2)
        RETURNING *
      `;
    const response = await client.query(SQL, [
      req.body.name,
      req.body.department_id,
    ]);
    res.status(201).send(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

//UPDATE employee data with key
app.put("/api/employees/:id", async (req, res, next) => {
  try {
    const SQL = /* sql */ `
        UPDATE employees
        SET name=$1, department_id=$2, updated_at=now()
        WHERE id=$3 RETURNING *
      `;
    const response = await client.query(SQL, [
      req.body.name,
      req.body.department_id,
      req.params.id,
    ]);
    res.send(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

//DELETE employee with foreign key
app.delete("/api/employees/:id", async (req, res, next) => {
  try {
    const SQL = `
        DELETE from employees
        WHERE id=$1
      `;
    const response = await client.query(SQL, [req.params.id]);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

//Error handling
app.use((error, req, res, next) => {
  res.status(res.status || 500).send({
    error: error,
  });
});

const init = async () => {
  await client.connect();
  //Create the tables
  let SQL = /* sql */ `
        DROP TABLE IF EXISTS employees;
        DROP TABLE IF EXISTS departments;

        CREATE TABLE departments(
            id SERIAL PRIMARY KEY,
            name VARCHAR(100)
        );

        CREATE TABLE employees(
            id SERIAL PRIMARY KEY,
            name VARCHAR(100),
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now(),
            department_id INTEGER REFERENCES departments(id) NOT NULL
        );
    `;
  await client.query(SQL);
  console.log("TABLES CREATED!");
  //Seed the data
  SQL = /* sql */ `
        INSERT INTO departments(name) VALUES('Pharmacy');
        INSERT INTO departments(name) VALUES('Nursing');
        INSERT INTO departments(name) VALUES('Quality Management');
        INSERT INTO employees(name, department_id) VALUES('Andrew', (SELECT id FROM departments WHERE name='Pharmacy'));
        INSERT INTO employees(name, department_id) VALUES('Mark', (SELECT id FROM departments WHERE name='Pharmacy'));
        INSERT INTO employees(name, department_id) VALUES('Sharise', (SELECT id FROM departments WHERE name='Nursing'));
        INSERT INTO employees(name, department_id) VALUES('Kathryn', (SELECT id FROM departments WHERE name='Quality Management'));
        INSERT INTO employees(name, department_id) VALUES('Gina', (SELECT id from departments WHERE name='Nursing'));
        INSERT INTO employees(name, department_id) VALUES('Jess', (SELECT id from departments WHERE name='Quality Management'));
    `;
  await client.query(SQL);
  console.log("DATA SEEDED!");

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`listening on port ${port}!`));
};

init();
