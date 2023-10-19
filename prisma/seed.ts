import { PrismaClient, User, Project, Meter, Role } from "@prisma/client";
const db = new PrismaClient();

async function seed() {
  const users = await Promise.all(getUsers().map(async data => await db.user.create({ data })));
  const projects = await Promise.all(getProjects().map(async data => await  db.project.create({ data })));
  await connect(users, projects);
  const meters = await Promise.all(getMeters().map(async data => await  db.meter.create({ data })));
  await addRecords(users, meters);
}

seed();

// shout-out to https://icanhazdadjoke.com/
function getProjects() {
  return [
    { name: "proj-1", code: `1111` }, // user-1
    { name: "proj-2", code: `2222` }, // user-2
    { name: "proj-3", code: `3333` }, // user-1
    { name: "proj-4", code: `4444` }, // user-2
    { name: "proj-5", code: `5555` }, // user-1
    { name: "proj-6", code: `6666` }, // user-1, user-2
    { name: "proj-7", code: `7777` }, // user-1, user-2
  ];
}

function getUsers() {
  return [
    { name: "user-1", password: "$2a$10$kTwQ7CeU5w2KQoSfnTUOLu29jSzFAH.Tz6QXgs3SXbOrel22n4tYO", title: Role.ENG },
    { name: "user-2", password: "$2a$10$kTwQ7CeU5w2KQoSfnTUOLu29jSzFAH.Tz6QXgs3SXbOrel22n4tYO", title: Role.ENM },
  ];
}

// 應該有什麼更聰明的方法...但 connect 好像不能用...
/** @link https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#connect */
async function connect(u: User[], p: Project[]) {
  await db.projectsOnUsers.create({ data: {userId: u[0].id, projectId: p[0].id}});
  await db.projectsOnUsers.create({ data: {userId: u[1].id, projectId: p[1].id}});
  await db.projectsOnUsers.create({ data: {userId: u[0].id, projectId: p[2].id}});
  await db.projectsOnUsers.create({ data: {userId: u[1].id, projectId: p[3].id}});
  await db.projectsOnUsers.create({ data: {userId: u[0].id, projectId: p[4].id}});
  await db.projectsOnUsers.create({ data: {userId: u[0].id, projectId: p[5].id}});
  await db.projectsOnUsers.create({ data: {userId: u[1].id, projectId: p[5].id}});
  await db.projectsOnUsers.create({ data: {userId: u[0].id, projectId: p[6].id}});
  await db.projectsOnUsers.create({ data: {userId: u[1].id, projectId: p[6].id}});
}

function getMeters() {
  return [
    { area: "area-11", waterId: "w0001", meterId: "m0001", projectId: 1 },
    { area: "area-11", waterId: "w0002", meterId: "m0002", projectId: 1 },
    { area: "area-12", waterId: "w0003", meterId: "m0003", projectId: 1 },
    { area: "area-21", waterId: "w0004", meterId: "m0004", projectId: 2 },
    { area: "area-21", waterId: "w0005", meterId: "m0005", projectId: 2 },
    { area: "area-22", waterId: "w0006", meterId: "m0006", projectId: 2 },
    { area: "area-31", waterId: "w0007", meterId: "m0007", projectId: 3 },
    { area: "area-31", waterId: "w0008", meterId: "m0008", projectId: 3 },
    { area: "area-32", waterId: "w0009", meterId: "m0009", projectId: 3 },
  ];
}

enum Status {
  success = "success",
  notRecord = "notRecord",
}

async function addRecords(u: User[], m: Meter[]) {
  await db.record.create({ data: {userId: u[0].id, meterId: m[1].id, status: Status.success, content: '123'}});
  await db.record.create({ data: {userId: u[1].id, meterId: m[0].id, status: Status.notRecord, content: '456'}});
  await db.record.create({ data: {userId: u[0].id, meterId: m[0].id, status: Status.success, content: '789'}});
}