from werkzeug.security import generate_password_hash
from conexion import obtener_conexion

usuario = input("Usuario: ")
contrasena = input("Contraseña: ")

contrasena_hash = generate_password_hash(contrasena)

conexion = obtener_conexion()
cursor = conexion.cursor()
cursor.execute(
    "INSERT INTO administradores (usuario, contrasena_hash) VALUES (%s, %s)",
    (usuario, contrasena_hash)
)
conexion.commit()
cursor.close()
conexion.close()

print(f"Administrador '{usuario}' creado correctamente.")