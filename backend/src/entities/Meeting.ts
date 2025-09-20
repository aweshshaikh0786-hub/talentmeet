import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class Meeting {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  roomId!: string;

  @ManyToOne(() => User)
  host!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
