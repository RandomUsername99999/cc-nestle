import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:cc_group/home_page.dart';
import 'package:cc_group/ui_components.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

bool hidePass = false;

class LoginPage extends StatelessWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        child: Column(
          children: [
            //Logo
            const LogoCard(),
            //Login Card
            const LoginCard(),
          ],
        ),
      ),
    );
  }
}

//Logo Card
class LogoCard extends StatelessWidget {
  const LogoCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black54,
            blurRadius: 5.0,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: const Column(
        children: [
          //Logo
          Logo(),
          SizedBox(
            height: 25,
            child: Row(
              children: [
                AppText(
                  text: "Enterprise Access Portal",
                  size: 15,
                  letterSpacing: 2,
                ),
              ],
            ),
          ),
          //Text
        ],
      ),
    );
  }
}

//Login Card
class LoginCard extends StatefulWidget {
  const LoginCard({super.key});

  @override
  State<LoginCard> createState() => _LoginCardState();
}

class _LoginCardState extends State<LoginCard> {
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _handleLogin() async {
    final username = _usernameController.text.trim();
    final password = _passwordController.text.trim();

    if (username.isEmpty || password.isEmpty) {
      setState(() => _errorMessage = "Please enter all fields");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await http.post(
        // Use 127.0.0.1 for desktop/web testing. Change to 10.0.2.2 for Android Emulator.
        Uri.parse('https://UnderpaidWorker.pythonanywhere.com/api/token/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': username,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        // Successful login
        final data = jsonDecode(response.body);
        final userIdValue = data['user_id'];
        final userRole = data['role'] ?? 'unknown';
        final accessToken = data['access'] ?? '';
        final refreshToken = data['refresh'] ?? '';

        // RBAC: Only drivers can use the mobile app
        if (userRole != 'driver') {
          setState(() {
            _isLoading = false;
            _errorMessage = "Access Denied: Mobile access is reserved for drivers only. Please use the web portal.";
          });
          return;
        }

        // Persist session with JWT tokens for authenticated API calls
        final prefs = await SharedPreferences.getInstance();
        await prefs.setInt('userId', userIdValue);
        await prefs.setString('access_token', accessToken);
        await prefs.setString('refresh_token', refreshToken);
        await prefs.setString('user_role', userRole);

        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => HomePage(userId: userIdValue)),
          );
        }
      } else {
        final errorData = jsonDecode(response.body);
        final errorMsg = errorData['detail'] ?? "Invalid credentials. Please try again.";
        setState(() => _errorMessage = errorMsg);
      }
    } catch (e) {
      setState(() => _errorMessage = "Connection error. Ensure backend is running at UnderpaidWorker.pythonanywhere.com");
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(10),
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(8.0),
              child: HoverContainer(
                container: Container(
                  width: 500,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    color: Colors.white,
                  ),
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const AppText(text: "Secure Login", size: 32),
                      const SizedBox(height: 10),
                      const RoleDisplayer(),
                      const SizedBox(height: 20),
                      _buildTextField("Username or Email", _usernameController, false),
                      const SizedBox(height: 15),
                      _buildTextField("Password", _passwordController, true),
                      const SizedBox(height: 10),
                      if (_errorMessage != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: Text(
                            _errorMessage!,
                            style: const TextStyle(color: Colors.red, fontSize: 13),
                          ),
                        ),
                      const Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          AppText(text: "Forgotten Password?", size: 14),
                        ],
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton(
                        onPressed: _isLoading ? null : _handleLogin,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color.fromARGB(255, 76, 47, 36),
                          minimumSize: const Size(double.infinity, 50),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : const Text("Secure Login", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                      const SizedBox(height: 20),
                      const AppText(text: "Authorized Use Only", size: 13),
                      const AppText(text: "Access is monitored and recorded", size: 12),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTextField(String label, TextEditingController controller, bool isPassword) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 5),
        TextField(
          controller: controller,
          obscureText: isPassword,
          decoration: InputDecoration(
            hintText: "Enter your $label",
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          ),
        ),
      ],
    );
  }
}

class HoverContainer extends StatefulWidget {
  final Widget container;
  const HoverContainer({super.key, required this.container});

  @override
  State<HoverContainer> createState() => _HoverContainerState();
}

class _HoverContainerState extends State<HoverContainer> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (event) => setState(() => _isHovered = true),
      onExit: (event) => setState(() => _isHovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          boxShadow: [
            BoxShadow(
              color: _isHovered
                  ? Colors.brown.withOpacity(0.5)
                  : Colors.black.withOpacity(0.5),

              blurRadius: _isHovered ? 15 : 5,
              spreadRadius: _isHovered ? 5 : 1,
              offset: Offset(0, _isHovered ? 8 : 3),
            ),
          ],
        ),
        child: widget.container,
      ),
    );
  }
}

String role = "System Admin";
var userRoles = {
  'SpecialDriver': 'Driver',
  'BigAdmin': 'Admin',
  'WarehouseWolf': 'Warehouse',
};

class InputField extends StatefulWidget {
  final String templateText;
  const InputField({super.key, required this.templateText});

  @override
  State<InputField> createState() => _InputFieldState();
}

class _InputFieldState extends State<InputField> {
  final myController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        const AppText(text: "Secure Login", size: 40),
        const RoleDisplayer(),
        const Row(children: [Text("Username or Email")]),
        TextField(
          controller: myController,
          cursorColor: Colors.brown,
          onChanged: (text) {
            setState(() {
              role = userRoles[myController.text] ?? "Undefined Role";
            });
          },
          decoration: InputDecoration(
            labelText: widget.templateText,
            floatingLabelBehavior: FloatingLabelBehavior.never,
            border: OutlineInputBorder(
              gapPadding: 1,
              borderRadius: BorderRadius.circular(5),
            ),
            focusedBorder: const OutlineInputBorder(
              borderSide: BorderSide(color: Colors.brown, width: 3),
            ),
          ),
        ),
      ],
    );
  }
}

class PasswordLabel extends StatefulWidget {
  const PasswordLabel({super.key});

  @override
  State<PasswordLabel> createState() => _PasswordLabelState();
}

class _PasswordLabelState extends State<PasswordLabel> {
  @override
  Widget build(BuildContext context) {
    return TextField(
      obscureText: hidePass,
      decoration: InputDecoration(
        labelText: "Password",
        floatingLabelBehavior: FloatingLabelBehavior.never,
        border: OutlineInputBorder(
          gapPadding: 1,
          borderRadius: BorderRadius.circular(5),
          borderSide: const BorderSide(color: Colors.blueGrey, width: 5),
        ),
        focusedBorder: const OutlineInputBorder(
          borderSide: BorderSide(color: Colors.brown, width: 3),
        ),
        suffixIcon: IconButton(
          onPressed: () {
            setState(() {
              hidePass = !hidePass;
            });
          },
          icon: Icon(hidePass ? Icons.visibility : Icons.visibility_off),
        ),
      ),
    );
  }
}

var colorThemes = {
  'Driver': Colors.black,
  'Admin': Colors.red,
  'Warehouse': const Color.fromARGB(255, 16, 239, 16),
};

class RoleDisplayer extends StatefulWidget {
  const RoleDisplayer({super.key});

  @override
  State<RoleDisplayer> createState() => _RoleDisplayerState();
}

class _RoleDisplayerState extends State<RoleDisplayer> {
  @override
  Widget build(BuildContext context) {
    // return AppText(text: "Role " + role, size: 20);
    return RichText(
      text: TextSpan(
        style: DefaultTextStyle.of(context).style.copyWith(
              fontSize: 20,
              color: const Color.fromARGB(255, 76, 47, 36),
            ),
        children: <TextSpan>[
          const TextSpan(text: "Role: "),
          TextSpan(
            text: role,
            style: TextStyle(color: colorThemes[role]),
          ),
        ],
      ),
    );
  }
}
