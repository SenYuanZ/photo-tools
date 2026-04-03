import { PartialType } from '@nestjs/mapped-types';
import { CreateInviteCodeDto } from './create-invite-code.dto';

export class UpdateInviteCodeDto extends PartialType(CreateInviteCodeDto) {}
