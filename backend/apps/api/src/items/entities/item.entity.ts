import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '@common/common';

@Entity('items')
export class Item {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ type: 'json', nullable: true })
    metadata: Record<string, any>;

    @ManyToOne(() => User, user => user.id, { nullable: true })
    @JoinColumn({ name: 'createdBy' })
    createdBy: User;

    @Column({ nullable: true })
    createdById: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
