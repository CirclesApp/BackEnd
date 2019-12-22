import { SocketRouter } from "../../socket.index";
import * as SocketIO from "socket.io";
import Club from "../../../schemas/Club";
import Logger from "../../../modules/Logger";
import { ObjectID } from "bson";

type MemberAndAttendanc = { _id: ObjectID; name: string; role: string; attendance: any };
type DateData = { idx: number; date: string; label: string };
type clubnameRequest = { clubname: string; datas?: MemberAndAttendanc[]; dates?: DateData[] };
type AttendanceResponse = { result: boolean; message: string; data?: any };
class Attendance {
	clubname: string;
	datas: MemberAndAttendanc[];
	dates: DateData[];
	constructor(clubname, datas, dates) {
		this.clubname = clubname;
		this.datas = datas;
		this.dates = dates;
	}
	setDatas(datas: MemberAndAttendanc[]) {
		this.datas = datas;
	}
	setDates(dates: DateData[]) {
		this.dates = dates;
	}
}

class AttendanceManager {
	attendances: Attendance[];
	constructor() {
		this.attendances = [] as Attendance[];
	}
	/**
	 * @description 중복이 있을경우 0, 중복이 없을경우 1을 반환
	 * @param clubname 동아리 이름
	 */
	checkRedundancy(clubname: string) {
		return this.attendances.findIndex(attendance => attendance.clubname == clubname) == -1;
	}
	createAttendance(clubname: string, datas: MemberAndAttendanc[], dates: DateData[]): Attendance {
		let attendance = new Attendance(clubname, datas, dates);
		this.attendances.push(attendance);
		return attendance;
	}
	deleteAttendance(clubname: string): void {
		this.attendances.splice(
			this.attendances.findIndex(attendance => attendance.clubname == clubname),
			1
		);
	}
	getAttendance(clubname: string): Attendance {
		return this.attendances.find(attendance => attendance.clubname == clubname);
	}
}
let attendanceManager = new AttendanceManager();

const socketRouter: SocketRouter = (io: SocketIO.Server, socket: SocketIO.Socket): void => {
	socket.on("attendance_createAttendance", (data: clubnameRequest) => {
		if (!attendanceManager.checkRedundancy(data.clubname)) {
			socket.emit("attendance_createAttendance", { result: false, message: "이미 생성된 출석입니다." } as AttendanceResponse);
		} else {
			let attendance = attendanceManager.createAttendance(data.clubname, data.datas, data.dates);
			socket.leaveAll();
			socket.join(data.clubname);
			io.sockets.in(data.clubname).emit("attendance_createAttendance", { result: true, message: "면접 생성 성공", data: attendance } as AttendanceResponse);
		}
	});
	socket.on("attendance_deleteAttendance", (data: clubnameRequest) => {
		if (!attendanceManager.checkRedundancy(data.clubname)) {
			attendanceManager.deleteAttendance(data.clubname);
			io.sockets.in(data.clubname).emit("attendance_deleteAttendance", { result: true, message: "면접 종료 성공" } as AttendanceResponse);
		} else {
			socket.emit("attendance_deleteAttendance", { result: false, message: "면접이 없습니다." } as AttendanceResponse);
		}
	});
	socket.on("attendance_getAttendanceByClubName", (data: clubnameRequest) => {
		socket.leaveAll();
		socket.join(data.clubname);
		if (!attendanceManager.checkRedundancy(data.clubname)) {
			socket.emit("attendance_getAttendanceByClubName", { result: true, message: "면접 가져오기 성공", data: attendanceManager.getAttendance(data.clubname) } as AttendanceResponse);
		} else {
			socket.emit("attendance_getAttendanceByClubName", { result: false, message: "면접이 없습니다." } as AttendanceResponse);
		}
	});
	socket.on("attendance_updateAttendance", (data: clubnameRequest) => {
		if (!attendanceManager.checkRedundancy(data.clubname)) {
			let attendance: Attendance = attendanceManager.getAttendance(data.clubname);
			attendance.setDatas(data.datas);
			attendance.setDates(data.dates);
			socket.broadcast.in(data.clubname).emit("attendance_updateAttendance", { result: true, message: "면접 갱신 성공", data: attendance } as AttendanceResponse);
		} else {
			socket.emit("attendance_updateAttendance", { result: false, message: "면접이 없습니다." } as AttendanceResponse);
		}
	});
};

export default socketRouter;