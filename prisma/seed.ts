import { PrismaClient, User, Project } from "@prisma/client";
const db = new PrismaClient();

async function seed() {
  const users = await Promise.all(getUsers().map(async data => await db.user.create({ data })));
  const projects = await Promise.all(getProjects().map(async data => await  db.project.create({ data })));
  await connect(users, projects);
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

enum Role {
  ENG = "ENG",
  ENM = "ENM",
  OFW = "OFW",
  ADM = "ADM",
}

function getUsers() {
  return [
    { name: "user-1", password: "abc123", title: Role.ENG },
    { name: "user-2", password: "abc123", title: Role.ENM },
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