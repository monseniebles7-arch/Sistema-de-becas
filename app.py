from flask import Flask, render_template, request, redirect, url_for, session
from conexion import obtener_conexion
from functools import wraps
from werkzeug.security import check_password_hash

app = Flask(__name__)
app.secret_key = "cambiar_esto_en_produccion"


def requiere_login(vista):
    @wraps(vista)
    def envoltura(*args, **kwargs):
        if "usuario" not in session:
            return redirect(url_for("login"))
        return vista(*args, **kwargs)
    return envoltura


@app.route("/")
def raiz():
    if "usuario" in session:
        return redirect(url_for("inicio"))
    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        usuario = request.form.get("usuario")
        contrasena = request.form.get("contrasena")

        conexion = obtener_conexion()
        cursor = conexion.cursor()
        cursor.execute(
            "SELECT contrasena_hash FROM administradores WHERE usuario = %s",
            (usuario,)
        )
        resultado = cursor.fetchone()
        cursor.close()
        conexion.close()

        if resultado and check_password_hash(resultado[0], contrasena):
            session["usuario"] = usuario
            return redirect(url_for("inicio"))
        else:
            return render_template(
                "login.html",
                error="Usuario o contraseña incorrectos."
            )

    return render_template("login.html")


@app.route("/logout")
def logout():
    session.pop("usuario", None)
    return redirect(url_for("login"))


@app.route("/registrar-estudiante", methods=["GET", "POST"])
@requiere_login
def registrar_estudiante():
    conexion = obtener_conexion()
    cursor = conexion.cursor(dictionary=True)

    cursor.execute(
        "SELECT id, nombre FROM universidades ORDER BY nombre"
    )
    universidades = cursor.fetchall()

    if request.method == "POST":
        cedula = request.form.get("cedula")
        nombre = request.form.get("nombre")
        apellido = request.form.get("apellido")
        universidad_id = request.form.get("universidad_id")
        correo = request.form.get("correo")
        telefono = request.form.get("telefono")

        try:
            cursor.execute(
                """INSERT INTO estudiantes
                   (cedula, nombre, apellido, universidad_id, correo, telefono)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (
                    cedula,
                    nombre,
                    apellido,
                    universidad_id,
                    correo,
                    telefono
                )
            )

            conexion.commit()
            cursor.close()
            conexion.close()

            return render_template(
                "registrar-estudiante.html",
                universidades=universidades,
                exito=True
            )

        except Exception as error:
            cursor.close()
            conexion.close()

            return render_template(
                "registrar-estudiante.html",
                universidades=universidades,
                error=f"No se pudo registrar: {error}"
            )

    cursor.close()
    conexion.close()

    return render_template(
        "registrar-estudiante.html",
        universidades=universidades
    )


@app.route("/estudiantes")
@requiere_login
def estudiantes():
    conexion = obtener_conexion()
    cursor = conexion.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            e.cedula,
            e.nombre,
            e.apellido,
            u.nombre AS universidad,
            e.correo,
            e.telefono
        FROM estudiantes e
        LEFT JOIN universidades u
            ON e.universidad_id = u.id
        ORDER BY e.apellido, e.nombre
    """)

    estudiantes = cursor.fetchall()

    cursor.close()
    conexion.close()

    return render_template(
        "estudiantes.html",
        estudiantes=estudiantes
    )


@app.route("/inicio")
@requiere_login
def inicio():
    try:
        conexion = obtener_conexion()
        cursor = conexion.cursor()

        cursor.execute("SELECT COUNT(*) FROM estudiantes")
        total = cursor.fetchone()[0]

        cursor.close()
        conexion.close()

        return render_template(
            "index.html",
            mensaje="Conexión exitosa a la base de datos.",
            total=total
        )

    except Exception as error:
        return render_template(
            "index.html",
            mensaje=f"Error de conexión: {error}",
            total=0
        )


if __name__ == "__main__":
    app.run(debug=True)

   