export class CreateRoomDto {
  name: string;
  // optional: username of the creator who will become admin
  creator?: string;
}