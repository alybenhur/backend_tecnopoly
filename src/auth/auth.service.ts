import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService }    from '@nestjs/jwt';
import { InjectModel }   from '@nestjs/mongoose';
import { Model }         from 'mongoose';
import * as bcrypt       from 'bcrypt';
import { User, UserDocument } from '../schemas/user.schema';
import { LoginDto }      from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // `password_hash` es `select: false`, hay que pedirlo explícitamente.
    const user = await this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+password_hash');
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    const token = this.jwtService.sign({
      sub:   user.id,
      email: user.email,
      role:  user.role,
    });

    return {
      access_token: token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }
}
